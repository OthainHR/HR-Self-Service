import { supabase } from './supabase';

/**
 * Profile service to handle profile picture operations
 */
export const profileService = {
  /**
   * Get the current user's profile picture URL
   */
  async getProfilePicture(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      return data?.profile_picture_url || null;
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      throw error;
    }
  },

  /**
   * Upload a profile picture for the current user
   */
  async uploadProfilePicture(userId, file) {
    try {
      if (!userId || !file) {
        throw new Error('User ID and file are required');
      }

      // Validate file type
      if (!file.type.startsWith('image/')) {
        throw new Error('Please select a valid image file');
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        throw new Error('File size must be less than 5MB');
      }

      // Generate unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${userId}-${Date.now()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      // Remove old profile picture if it exists
      await this.removeOldProfilePicture(userId);

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('profile-pictures')
        .upload(filePath, file, {
          upsert: true,
          contentType: file.type
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('profile-pictures')
        .getPublicUrl(filePath);

      // Update or create user profile record
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          user_id: userId,
          profile_picture_url: publicUrl,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });

      if (upsertError) {
        throw upsertError;
      }

      return publicUrl;
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      throw error;
    }
  },

  /**
   * Delete the current user's profile picture
   */
  async deleteProfilePicture(userId) {
    try {
      if (!userId) {
        throw new Error('User ID is required');
      }

      // Get current profile picture URL
      const { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      if (!profileData?.profile_picture_url) {
        return; // No profile picture to delete
      }

      // Extract file path from URL
      const url = new URL(profileData.profile_picture_url);
      const pathSegments = url.pathname.split('/');
      const fileName = pathSegments[pathSegments.length - 1];
      const filePath = `${userId}/${fileName}`;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);

      if (deleteError) {
        console.warn('Error deleting file from storage:', deleteError);
        // Continue with database update even if file deletion fails
      }

      // Update profile record
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ 
          profile_picture_url: null,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (updateError) {
        throw updateError;
      }
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      throw error;
    }
  },

  /**
   * Remove old profile picture when uploading a new one
   */
  async removeOldProfilePicture(userId) {
    try {
      // Get current profile picture URL
      const { data: profileData, error: fetchError } = await supabase
        .from('user_profiles')
        .select('profile_picture_url')
        .eq('user_id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        return; // Ignore errors when fetching old profile
      }

      if (!profileData?.profile_picture_url) {
        return; // No existing profile picture
      }

      // Extract file path from URL
      const url = new URL(profileData.profile_picture_url);
      const pathSegments = url.pathname.split('/');
      const fileName = pathSegments[pathSegments.length - 1];
      const filePath = `${userId}/${fileName}`;

      // Delete old file from storage
      const { error: deleteError } = await supabase.storage
        .from('profile-pictures')
        .remove([filePath]);

      if (deleteError) {
        console.warn('Warning: Could not delete old profile picture:', deleteError);
        // Don't throw error, as this is not critical
      }
    } catch (error) {
      console.warn('Warning: Could not remove old profile picture:', error);
      // Don't throw error, as this is not critical
    }
  },

  /**
   * Get multiple users' profile pictures (for displaying in chat, etc.)
   */
  async getMultipleProfilePictures(userIds) {
    try {
      if (!Array.isArray(userIds) || userIds.length === 0) {
        return {};
      }

      const { data, error } = await supabase
        .from('user_profiles')
        .select('user_id, profile_picture_url')
        .in('user_id', userIds);

      if (error) {
        throw error;
      }

      // Convert to map for easy lookup
      const profileMap = {};
      data.forEach(profile => {
        profileMap[profile.user_id] = profile.profile_picture_url;
      });

      return profileMap;
    } catch (error) {
      console.error('Error fetching multiple profile pictures:', error);
      return {}; // Return empty object on error
    }
  },

  /**
   * Subscribe to profile picture changes for a user
   */
  subscribeToProfileChanges(userId, callback) {
    if (!userId || typeof callback !== 'function') {
      console.error('User ID and callback function are required for subscription');
      return null;
    }

    const subscription = supabase
      .channel(`profile-changes-${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_profiles',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log('Profile change detected:', payload);
          callback(payload);
        }
      )
      .subscribe();

    return subscription;
  },

  /**
   * Unsubscribe from profile picture changes
   */
  unsubscribeFromProfileChanges(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
};

export default profileService;
