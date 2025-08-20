import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Paper,
  Typography,
  Box,
  Avatar,
  Button,
  Alert,
  CircularProgress,
  Skeleton,
  Fade,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  PhotoCamera
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useDarkMode } from '../contexts/DarkModeContext';
import { profileService } from '../services/profileService';
import ImageCropModal from '../components/ImageCropModal';

const Profile = () => {
  const { user } = useAuth();
  const { isDarkMode } = useDarkMode();
  const fileInputRef = useRef(null);

  const [profilePicture, setProfilePicture] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [imageToCrop, setImageToCrop] = useState(null);

  const getDisplayName = () => {
    if (user?.name) {
      return user.name;
    }
    if (user?.email) {
      try {
        const emailParts = user.email.split('@');
        const namePart = emailParts[0];
        const firstName = namePart.split('.')[0];
        if (firstName) {
          return firstName.charAt(0).toUpperCase() + firstName.slice(1);
        }
      } catch (e) {
        return user.email;
      }
      return user.email;
    }
    return 'User';
  };

  const displayName = getDisplayName();

  useEffect(() => {
    fetchProfilePicture();
  }, [user]);

  // Cleanup temporary image URLs on unmount
  useEffect(() => {
    return () => {
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
      }
    };
  }, [imageToCrop]);

  const fetchProfilePicture = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const profilePictureUrl = await profileService.getProfilePicture(user.id);
      if (profilePictureUrl) {
        setProfilePicture(profilePictureUrl);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      setError('Failed to load profile picture');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 10MB for initial selection, we'll compress during crop)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Create URL for cropping
    const imageUrl = URL.createObjectURL(file);
    setImageToCrop(imageUrl);
    setCropModalOpen(true);
    setError(null);
    
    // Reset the file input
    event.target.value = '';
  };

  const handleCropComplete = async (croppedImageBlob) => {
    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      // Create a File from the blob
      const croppedFile = new File([croppedImageBlob], 'profile-picture.jpg', {
        type: 'image/jpeg',
      });

      const publicUrl = await profileService.uploadProfilePicture(user.id, croppedFile);
      setProfilePicture(publicUrl);
      setSuccess('Profile picture updated successfully!');
      
      // Close the crop modal
      setCropModalOpen(false);
      
      // Clean up the temporary image URL
      if (imageToCrop) {
        URL.revokeObjectURL(imageToCrop);
        setImageToCrop(null);
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
      setError(error.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleCropCancel = () => {
    setCropModalOpen(false);
    if (imageToCrop) {
      URL.revokeObjectURL(imageToCrop);
      setImageToCrop(null);
    }
  };

  const handleDeletePicture = async () => {
    if (!profilePicture) return;

    try {
      setUploading(true);
      setError(null);
      setSuccess(null);

      await profileService.deleteProfilePicture(user.id);
      setProfilePicture(null);
      setSuccess('Profile picture removed successfully!');
    } catch (error) {
      console.error('Error deleting profile picture:', error);
      setError(error.message || 'Failed to delete profile picture. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        duration: 0.6,
        ease: "easeOut"
      }
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <Paper
          elevation={0}
          sx={{
            p: 4,
            borderRadius: '20px',
            background: isDarkMode
              ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.8) 0%, rgba(15, 23, 42, 0.9) 100%)'
              : 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
            boxShadow: isDarkMode
              ? '0 25px 50px rgba(0, 0, 0, 0.5)'
              : '0 25px 50px rgba(0, 0, 0, 0.1)',
            position: 'relative',
            overflow: 'hidden'
          }}
        >
          {/* Background decorative elements */}
          <Box
            sx={{
              position: 'absolute',
              top: -50,
              right: -50,
              width: 200,
              height: 200,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              opacity: 0.1,
              filter: 'blur(40px)'
            }}
          />
          
          <Typography
            variant="h4"
            sx={{
              mb: 4,
              fontWeight: 700,
              color: isDarkMode ? '#f1f5f9' : '#1e293b',
              textAlign: 'center',
              position: 'relative',
              zIndex: 1
            }}
          >
            Profile Settings
          </Typography>

          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              position: 'relative',
              zIndex: 1
            }}
          >
            {/* Profile Picture Section */}
            <Box sx={{ position: 'relative' }}>
              {loading ? (
                <Skeleton
                  variant="circular"
                  width={150}
                  height={150}
                  sx={{
                    bgcolor: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'
                  }}
                />
              ) : (
                <Avatar
                  src={profilePicture}
                  sx={{
                    width: 150,
                    height: 150,
                    fontSize: '3rem',
                    fontWeight: 700,
                    background: profilePicture
                      ? 'none'
                      : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    boxShadow: '0 15px 35px rgba(99, 102, 241, 0.3)',
                    border: `4px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(255, 255, 255, 0.8)'}`,
                    transition: 'all 0.3s ease'
                  }}
                >
                  {!profilePicture && displayName.charAt(0).toUpperCase()}
                </Avatar>
              )}

              {/* Upload/Edit Button */}
              <Tooltip title={profilePicture ? "Change picture" : "Upload picture"} arrow>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    right: 8,
                    bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.9)' : 'rgba(255, 255, 255, 0.9)',
                    color: isDarkMode ? '#e2e8f0' : '#334155',
                    backdropFilter: 'blur(10px)',
                    border: `2px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
                    '&:hover': {
                      bgcolor: isDarkMode ? 'rgba(30, 41, 59, 1)' : 'rgba(255, 255, 255, 1)',
                      transform: 'scale(1.1)'
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <CircularProgress size={20} />
                  ) : (
                    <PhotoCamera />
                  )}
                </IconButton>
              </Tooltip>
            </Box>

            {/* User Info */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 600,
                  color: isDarkMode ? '#f1f5f9' : '#1e293b',
                  mb: 1
                }}
              >
                {displayName}
              </Typography>
              <Typography
                variant="body1"
                sx={{
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '1rem'
                }}
              >
                {user?.email}
              </Typography>
            </Box>

            {/* Action Buttons */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                sx={{
                  borderRadius: '12px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: 'white',
                  px: 3,
                  py: 1,
                  fontWeight: 600,
                  boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)',
                    transform: 'translateY(-2px)',
                    boxShadow: '0 12px 30px rgba(99, 102, 241, 0.4)'
                  }
                }}
              >
{uploading ? 'Uploading...' : profilePicture ? 'Change & Crop Picture' : 'Select & Crop Picture'}
              </Button>

              {profilePicture && (
                <Button
                  variant="outlined"
                  startIcon={<Delete />}
                  onClick={handleDeletePicture}
                  disabled={uploading}
                  sx={{
                    borderRadius: '12px',
                    borderColor: '#ef4444',
                    color: '#ef4444',
                    px: 3,
                    py: 1,
                    fontWeight: 600,
                    '&:hover': {
                      borderColor: '#dc2626',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      transform: 'translateY(-2px)'
                    }
                  }}
                >
                  Remove Picture
                </Button>
              )}
            </Box>

            {/* File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />

            {/* Success/Error Messages */}
            <AnimatePresence>
              {(error || success) && (
                <Fade in={Boolean(error || success)}>
                  <Alert
                    severity={error ? 'error' : 'success'}
                    onClose={() => {
                      setError(null);
                      setSuccess(null);
                    }}
                    sx={{
                      borderRadius: '12px',
                      width: '100%',
                      maxWidth: '400px'
                    }}
                  >
                    {error || success}
                  </Alert>
                </Fade>
              )}
            </AnimatePresence>

            {/* Upload Guidelines */}
            <Box
              sx={{
                mt: 2,
                p: 3,
                borderRadius: '12px',
                background: isDarkMode
                  ? 'rgba(71, 85, 105, 0.2)'
                  : 'rgba(248, 250, 252, 0.8)',
                border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
                width: '100%',
                maxWidth: '400px'
              }}
            >
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 600,
                  color: isDarkMode ? '#e2e8f0' : '#334155',
                  mb: 1
                }}
              >
                Upload & Crop Guidelines
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: isDarkMode ? '#94a3b8' : '#64748b',
                  fontSize: '0.875rem',
                  lineHeight: 1.5
                }}
              >
                • Supported formats: JPG, PNG, GIF<br />
                • Maximum file size: 10MB for upload<br />
                • Crop and zoom to select the perfect area<br />
                • Final image will be optimized automatically<br />
                • Your photo will be visible in the chat interface
              </Typography>
            </Box>
          </Box>
        </Paper>
      </motion.div>

      {/* Image Crop Modal */}
      <ImageCropModal
        open={cropModalOpen}
        onClose={handleCropCancel}
        imageSrc={imageToCrop}
        onCropComplete={handleCropComplete}
        uploading={uploading}
      />
    </Container>
  );
};

export default Profile;
