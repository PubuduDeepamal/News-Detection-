import { Container, Typography, Box, Button, Card, CardContent } from '@mui/material';

const ExtensionPage = () => {
  const zipUrl = '/extension.zip';
  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h2" align="center" sx={{ fontWeight: 700, mb: 2 }}>
          Browser Extension
        </Typography>
        <Typography align="center" color="text.secondary" sx={{ mb: 4 }}>
          Install the Chrome extension to analyze pages with Local ML, Llama, or GPT.
        </Typography>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>Install Steps</Typography>
            <Box component="ol" sx={{ pl: 3, mb: 2 }}>
              <li>Download the extension zip.</li>
              <li>Open chrome://extensions and enable Developer mode.</li>
              <li>Click Load unpacked and select the unzipped folder.</li>
            </Box>
            <Button variant="contained" href={zipUrl} download>
              Download Extension
            </Button>
          </CardContent>
        </Card>
      </Box>
    </Container>
  );
};

export default ExtensionPage;


