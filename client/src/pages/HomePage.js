import { Link } from 'react-router-dom';
import { 
  Container, 
  Typography, 
  Button, 
  Box, 
  Card, 
  CardContent, 
  Grid,
  Paper,
  useTheme
} from '@mui/material';
import { 
  CheckCircle, 
  Description, 
  Timeline, 
  ArrowForward 
} from '@mui/icons-material';
import DetectionPage from './DetectionPage';

const HomePage = () => {
  const theme = useTheme();

  const features = [
    {
      icon: <CheckCircle sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: 'Accurate Detection',
      description: 'Our system uses state-of-the-art machine learning models trained on thousands of articles to accurately identify fake news with high precision (99.1% accuracy).'
    },
    {
      icon: <Description sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: 'Detailed Explanations',
      description: 'Unlike other systems, we provide detailed explanations for why content is identified as potentially false, ensuring transparency and accountability.'
    },
    {
      icon: <Timeline sx={{ fontSize: 48, color: theme.palette.primary.main }} />,
      title: 'Context Aware',
      description: 'Our detection system analyzes contextual factors like linguistic patterns, source credibility, and content structure for comprehensive evaluation.'
    }
  ];

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 8, textAlign: 'center', pt: { xs: 4, md: 8 } }}>
        <Typography 
          variant="h1" 
          sx={{ 
            mb: 2,
            fontSize: { xs: '2rem', md: '3rem' },
            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          Detect Fake News with AI
        </Typography>
        <Typography 
          variant="h5" 
          color="text.secondary" 
          sx={{ mb: 4, maxWidth: '800px', mx: 'auto' }}
        >
          Using advanced Machine Learning and Large Language Models to identify and explain potentially false information
        </Typography>
        <Box sx={{ maxWidth: 1000, mx: 'auto' }}>
          <DetectionPage />
        </Box>
      </Box>

      <Box sx={{ display: 'flex', gap: 3, mb: 8, flexDirection: { xs: 'column', md: 'row' } }}>
        {features.map((feature, index) => (
          <Card
            key={index}
            elevation={0}
            sx={{
              flex: 1,
              height: '100%',
              transition: 'transform 0.3s, box-shadow 0.3s',
              '&:hover': {
                transform: 'translateY(-8px)',
                boxShadow: theme.palette.mode === 'dark'
                  ? '0 8px 24px rgba(0,0,0,0.6)'
                  : '0 8px 24px rgba(0,0,0,0.12)',
              },
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ mb: 2 }}>
                {feature.icon}
              </Box>
              <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
                {feature.title}
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {feature.description}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Paper 
        elevation={0} 
        sx={{ 
          p: { xs: 3, md: 4 }, 
          borderRadius: 3,
          backgroundColor: theme.palette.mode === 'dark' 
            ? 'rgba(66, 66, 66, 0.3)' 
            : 'rgba(25, 118, 210, 0.05)',
        }}
      >
        
        <Typography variant="h3" gutterBottom sx={{ fontWeight: 700 }}>
          About Fake News Detection
        </Typography>
        <Typography variant="body1" paragraph color="text.secondary" sx={{ mb: 2 }}>
          In today's world, information spreads rapidly through social media and digital platforms. 
          This has led to an increase in fake news that can cause social unrest and damage public trust in media.
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Our mission is to provide accessible tools to help verify information and identify potentially false content
          using advanced AI technology, machine learning models, and large language models.
        </Typography>
      </Paper>
    </Container>
  );
};

export default HomePage;
