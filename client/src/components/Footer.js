import { Box, Typography, Container, useTheme } from '@mui/material';

const Footer = () => {
  const theme = useTheme();
  
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(30, 30, 30, 0.9)' 
          : 'rgba(245, 245, 245, 0.9)',
        borderTop: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Container maxWidth="lg">
        <Typography 
          variant="body2" 
          color="text.secondary" 
          align="center"
        >
          © {new Date().getFullYear()} Fake News Detection | All Rights Reserved
        </Typography>
      </Container>
    </Box>
  );
};

export default Footer;
