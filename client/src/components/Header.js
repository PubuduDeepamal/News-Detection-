import { Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  IconButton, 
  Box,
  useMediaQuery,
  useTheme
} from '@mui/material';
import { 
  Brightness4, 
  Brightness7, 
  VerifiedUser 
} from '@mui/icons-material';
import { useThemeMode } from '../ThemeContext';

const Header = () => {
  const location = useLocation();
  const theme = useTheme();
  const { mode, toggleTheme } = useThemeMode();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const navItems = [
    { label: 'Home', path: '/' },
    { label: 'Detection', path: '/detection' },
    { label: 'Resources', path: '/resources' },
    { label: 'Extension', path: '/extension' },
  ];

  return (
    <AppBar 
      position="sticky" 
      elevation={0}
      sx={{
        backdropFilter: 'blur(10px)',
        backgroundColor: theme.palette.mode === 'dark' 
          ? 'rgba(30, 30, 30, 0.9)' 
          : 'rgba(255, 255, 255, 0.9)',
        borderBottom: `1px solid ${theme.palette.divider}`,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', py: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <VerifiedUser sx={{ fontSize: 32, color: theme.palette.primary.main }} />
          <Typography 
            variant="h6" 
            component={Link} 
            to="/"
            sx={{ 
              textDecoration: 'none',
              color: theme.palette.text.primary,
              fontWeight: 700,
              display: isMobile ? 'none' : 'block'
            }}
          >
            Fake News Detection
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {!isMobile && navItems.map((item) => (
            <Button
              key={item.path}
              component={Link}
              to={item.path}
              sx={{
                color: location.pathname === item.path 
                  ? theme.palette.primary.main 
                  : theme.palette.text.primary,
                fontWeight: location.pathname === item.path ? 700 : 500,
                px: 2,
                '&:hover': {
                  backgroundColor: theme.palette.action.hover,
                },
              }}
            >
              {item.label}
            </Button>
          ))}
          
          <IconButton onClick={toggleTheme} color="inherit">
            {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
          </IconButton>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
