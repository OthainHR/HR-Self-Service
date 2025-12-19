import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Slider,
  Typography,
  CircularProgress,
  IconButton
} from '@mui/material';
import {
  Close,
  CropFree,
  ZoomIn,
  RotateLeft,
  RotateRight
} from '@mui/icons-material';
import Cropper from 'react-easy-crop';
import { useDarkMode } from '../contexts/DarkModeContext';

const ImageCropModal = ({
  open,
  onClose,
  imageSrc,
  onCropComplete,
  uploading = false
}) => {
  const { isDarkMode } = useDarkMode();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (croppedAreaPixels && onCropComplete) {
      try {
        const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels, rotation);
        onCropComplete(croppedImage);
      } catch (error) {
        console.error('Error cropping image:', error);
      }
    }
  };

  const handleRotateLeft = () => {
    setRotation((prev) => prev - 90);
  };

  const handleRotateRight = () => {
    setRotation((prev) => prev + 90);
  };

  const handleReset = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setRotation(0);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '20px',
          background: isDarkMode
            ? 'linear-gradient(145deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)'
            : 'linear-gradient(145deg, rgba(255, 255, 255, 0.95) 0%, rgba(248, 250, 252, 0.95) 100%)',
          backdropFilter: 'blur(20px)',
          border: `1px solid ${isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'}`,
          minHeight: '600px'
        }
      }}
    >
      <DialogTitle
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: isDarkMode ? '#f1f5f9' : '#1e293b',
          fontWeight: 700,
          fontSize: '1.5rem'
        }}
      >
        Crop Your Profile Picture
        <IconButton
          onClick={onClose}
          sx={{
            color: isDarkMode ? '#94a3b8' : '#64748b'
          }}
          disabled={uploading}
        >
          <Close />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0, height: '400px', position: 'relative' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          rotation={rotation}
          zoom={zoom}
          aspect={1}
          onCropChange={setCrop}
          onRotationChange={setRotation}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
          style={{
            containerStyle: {
              background: isDarkMode ? 'rgba(15, 23, 42, 0.8)' : 'rgba(248, 250, 252, 0.8)'
            },
            cropAreaStyle: {
              border: '2px solid #6366f1',
              borderRadius: '50%',
              boxShadow: '0 0 0 9999em rgba(0, 0, 0, 0.5)'
            }
          }}
          showGrid={false}
          cropShape="round"
        />
      </DialogContent>

      <DialogContent sx={{ pt: 2 }}>
        {/* Zoom Control */}
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
            <ZoomIn sx={{ color: isDarkMode ? '#94a3b8' : '#64748b' }} />
            <Typography
              variant="body2"
              sx={{ color: isDarkMode ? '#e2e8f0' : '#334155', fontWeight: 600 }}
            >
              Zoom
            </Typography>
          </Box>
          <Slider
            value={zoom}
            min={1}
            max={3}
            step={0.1}
            onChange={(e, zoom) => setZoom(zoom)}
            sx={{
              color: '#6366f1',
              '& .MuiSlider-thumb': {
                backgroundColor: '#6366f1',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)'
              },
              '& .MuiSlider-track': {
                backgroundColor: '#6366f1'
              }
            }}
          />
        </Box>

        {/* Rotation Controls */}
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="body2"
            sx={{ 
              color: isDarkMode ? '#e2e8f0' : '#334155', 
              fontWeight: 600, 
              mb: 1 
            }}
          >
            Rotate
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
            <Button
              onClick={handleRotateLeft}
              variant="outlined"
              size="small"
              startIcon={<RotateLeft />}
              disabled={uploading}
              sx={{
                borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)',
                color: isDarkMode ? '#e2e8f0' : '#334155'
              }}
            >
              Left
            </Button>
            <Button
              onClick={handleRotateRight}
              variant="outlined"
              size="small"
              startIcon={<RotateRight />}
              disabled={uploading}
              sx={{
                borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)',
                color: isDarkMode ? '#e2e8f0' : '#334155'
              }}
            >
              Right
            </Button>
            <Button
              onClick={handleReset}
              variant="outlined"
              size="small"
              startIcon={<CropFree />}
              disabled={uploading}
              sx={{
                borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)',
                color: isDarkMode ? '#e2e8f0' : '#334155'
              }}
            >
              Reset
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 3, gap: 2 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={uploading}
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1,
            borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.5)' : 'rgba(203, 213, 225, 0.5)',
            color: isDarkMode ? '#e2e8f0' : '#334155',
            '&:hover': {
              borderColor: isDarkMode ? 'rgba(71, 85, 105, 0.7)' : 'rgba(203, 213, 225, 0.7)'
            }
          }}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={uploading || !croppedAreaPixels}
          startIcon={uploading ? <CircularProgress size={16} /> : null}
          sx={{
            borderRadius: '12px',
            px: 3,
            py: 1,
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.3)',
            '&:hover': {
              background: 'linear-gradient(135deg, #5b5bd6 0%, #7c3aed 100%)',
              transform: 'translateY(-1px)',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.4)'
            },
            '&:disabled': {
              background: isDarkMode ? 'rgba(71, 85, 105, 0.3)' : 'rgba(203, 213, 225, 0.3)'
            }
          }}
        >
          {uploading ? 'Uploading...' : 'Save & Upload'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

// Utility function to create cropped image that matches react-easy-crop selection
// Based on recommended approach from the library docs
const getCroppedImg = (imageSrc, pixelCrop, rotation = 0) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }

      const safeArea = Math.max(image.width, image.height) * 2;

      // Create a large enough canvas to allow for a safe rotation
      canvas.width = safeArea;
      canvas.height = safeArea;

      // Move the origin to the center of the canvas
      ctx.translate(safeArea / 2, safeArea / 2);
      ctx.rotate(getRadianAngle(rotation));
      ctx.translate(-image.width / 2, -image.height / 2);

      // Draw the rotated image on the canvas
      ctx.drawImage(image, 0, 0);

      // Now crop the rotated image to the selection
      const data = ctx.getImageData(
        pixelCrop.x + (safeArea / 2 - image.width / 2),
        pixelCrop.y + (safeArea / 2 - image.height / 2),
        pixelCrop.width,
        pixelCrop.height
      );

      // Set canvas to the desired output size
      canvas.width = pixelCrop.width;
      canvas.height = pixelCrop.height;

      // Paste the data back
      ctx.putImageData(data, 0, 0);

      canvas.toBlob(
        (file) => {
          if (file) {
            resolve(file);
          } else {
            reject(new Error('Failed to create cropped image blob'));
          }
        },
        'image/jpeg',
        0.9
      );
    };

    image.onerror = () => reject(new Error('Failed to load image'));
    image.src = imageSrc;
  });
};

const getRadianAngle = (degreeValue) => {
  return (degreeValue * Math.PI) / 180;
};

const rotateSize = (width, height, rotation) => {
  const rotRad = getRadianAngle(rotation);

  return {
    width:
      Math.abs(Math.cos(rotRad) * width) + Math.abs(Math.sin(rotRad) * height),
    height:
      Math.abs(Math.sin(rotRad) * width) + Math.abs(Math.cos(rotRad) * height),
  };
};

export default ImageCropModal;
