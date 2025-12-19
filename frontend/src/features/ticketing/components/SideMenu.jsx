import React from 'react';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText } from '@mui/material';
import { Inbox as InboxIcon, Mail as MailIcon } from '@mui/icons-material'; // Example icons

const SideMenu = () => {
  // Placeholder menu items - you can customize these
  const menuItems = [
    { text: 'All open', icon: <InboxIcon />, path: '/tickets/all-open' },
    { text: 'Assigned to me', icon: <MailIcon />, path: '/tickets/assigned' },
    // Add more menu items as needed, mirroring your screenshot
  ];

  return (
    <Box
      sx={{
        width: 250,
        height: '100%',
        bgcolor: 'background.paper',
        borderRight: '1px solid divider',
      }}
    >
      <List>
        {menuItems.map((item, index) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton component="a" href={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default SideMenu; 