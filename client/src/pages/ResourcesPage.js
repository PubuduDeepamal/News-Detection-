import { 
  Container, 
  Typography, 
  Box, 
  Card, 
  CardContent, 
  Grid,
  List,
  ListItem,
  ListItemText,
  Link as MuiLink,
  Paper,
  useTheme
} from '@mui/material';
import { 
  Warning, 
  Verified, 
  CheckCircle, 
  Info,
  OpenInNew 
} from '@mui/icons-material';

const ResourcesPage = () => {
  const theme = useTheme();

  const characteristics = [
    { 
      title: 'Sensationalist Headlines', 
      description: 'Headlines designed to provoke strong emotional responses' 
    },
    { 
      title: 'Unverified Sources', 
      description: 'Lack of credible source attribution or references' 
    },
    { 
      title: 'Outdated Information', 
      description: 'Presenting old information as current news' 
    },
    { 
      title: 'Manipulated Content', 
      description: 'Altered images, quotes taken out of context' 
    },
    { 
      title: 'Biased Reporting', 
      description: 'One-sided presentation of facts with clear agenda' 
    }
  ];

  const tips = [
    { title: 'Check the Source', description: 'Verify the credibility of the website, author, and publisher' },
    { title: 'Read Beyond Headlines', description: 'Headlines can be misleading - read the full article' },
    { title: 'Verify with Multiple Sources', description: 'Cross-check information with other reliable sources' },
    { title: 'Check Dates', description: 'Old news may be presented as current events' },
    { title: 'Consider Biases', description: 'Be aware of your own biases and the potential biases of the source' }
  ];

  const externalResources = [
    { 
      name: 'FactCheck.org', 
      url: 'https://www.factcheck.org/', 
      description: 'Nonpartisan, nonprofit website that monitors factual accuracy in politics' 
    },
    { 
      name: 'Snopes', 
      url: 'https://www.snopes.com/', 
      description: 'One of the oldest and most popular fact-checking websites' 
    },
    { 
      name: 'PolitiFact', 
      url: 'https://www.politifact.com/', 
      description: 'Focuses on political claims and statements' 
    },
    { 
      name: 'AllSides', 
      url: 'https://www.allsides.com/unbiased-balanced-news', 
      description: 'Provides multiple perspectives on the same news story' 
    }
  ];

  const downloads = [
    {
      name: 'Chrome Extension',
      url: '/extension',
      description: 'Install the browser extension to analyze any page using Local ML, Llama, or GPT'
    }
  ];

  const apiEndpoints = [
    { name: 'GPT Detection', url: 'https://newsdetection.cloud/api/detect/gpt', description: 'POST { content, twitterLink? }' },
    { name: 'Llama Detection', url: 'https://newsdetection.cloud/api/detect/llama', description: 'POST { content }' },
    { name: 'Local ML Predict', url: 'https://newsdetection.cloud/api/ml/predict', description: 'POST { content }' },
    { name: 'Local ML Retrain', url: 'https://newsdetection.cloud/api/ml/retrain', description: 'POST {}' }
  ];

  return (
    <Container maxWidth="lg">
      <Typography 
        variant="h2" 
        align="center" 
        gutterBottom
        sx={{ fontWeight: 700, mb: 1 }}
      >
        Resources on Fake News
      </Typography>
      <Typography 
        variant="body1" 
        align="center" 
        color="text.secondary"
        sx={{ mb: 6 }}
      >
        Learn how to identify and combat misinformation
      </Typography>

      <Card elevation={0} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Info sx={{ color: theme.palette.primary.main }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Understanding Fake News
            </Typography>
          </Box>
          <Typography variant="body1" color="text.secondary">
            Fake news is information presented as legitimate news but has no truth and is deliberately created and distributed 
            to cause social unrest or serve specific agendas. This has led to a decline in public trust in media.
          </Typography>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Warning sx={{ color: theme.palette.warning.main }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Common Characteristics
            </Typography>
          </Box>
          <List>
            {characteristics.map((char, index) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 1 }}>
                <ListItemText
                  primary={
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {char.title}
                    </Typography>
                  }
                  secondary={char.description}
                />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <CheckCircle sx={{ color: theme.palette.success.main }} />
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Tips to Identify Fake News
          </Typography>
        </Box>
        <Grid container spacing={2}>
          {tips.map((tip, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper 
                elevation={0}
                sx={{ 
                  p: 2, 
                  height: '100%',
                  borderLeft: `4px solid ${theme.palette.primary.main}`,
                  backgroundColor: theme.palette.mode === 'dark' 
                    ? 'rgba(66, 66, 66, 0.3)' 
                    : 'rgba(25, 118, 210, 0.05)',
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                  {tip.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {tip.description}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Card elevation={0} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <OpenInNew sx={{ color: theme.palette.info.main }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              External Resources
            </Typography>
          </Box>
          <List>
            {externalResources.map((resource, index) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
                <MuiLink 
                  href={resource.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: theme.palette.primary.main,
                    '&:hover': {
                      textDecoration: 'underline',
                    }
                  }}
                >
                  {resource.name}
                </MuiLink>
                <Typography variant="body2" color="text.secondary">
                  {resource.description}
                </Typography>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <OpenInNew sx={{ color: theme.palette.info.main }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Downloads
            </Typography>
          </Box>
          <List>
            {downloads.map((item, index) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
                <MuiLink 
                  href={item.url} 
                  sx={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: theme.palette.primary.main,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {item.name}
                </MuiLink>
                <Typography variant="body2" color="text.secondary">
                  {item.description}
                </Typography>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card elevation={0} sx={{ mb: 4 }}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <OpenInNew sx={{ color: theme.palette.info.main }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              API Endpoints
            </Typography>
          </Box>
          <List>
            {apiEndpoints.map((api, index) => (
              <ListItem key={index} sx={{ flexDirection: 'column', alignItems: 'flex-start', mb: 2 }}>
                <MuiLink 
                  href={api.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  sx={{ 
                    fontSize: '1.1rem', 
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: theme.palette.primary.main,
                    '&:hover': { textDecoration: 'underline' }
                  }}
                >
                  {api.name}
                </MuiLink>
                <Typography variant="body2" color="text.secondary">
                  {api.description}
                </Typography>
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>

      <Card elevation={0}>
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Verified sx={{ color: theme.palette.success.main }} />
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              Technologies Used
            </Typography>
          </Box>
          <Typography variant="body1" paragraph color="text.secondary">
            Modern fake news detection systems like ours use advanced technologies such as Large Language Models (LLMs), 
            machine learning algorithms, and natural language processing to analyze content for authenticity.
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Our system examines factors including writing style, source credibility, factual consistency, 
            and contextual relevance to determine whether content is likely authentic or potentially false.
          </Typography>
        </CardContent>
      </Card>
    </Container>
  );
};

export default ResourcesPage;
