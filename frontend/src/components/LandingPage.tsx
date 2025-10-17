// components/LandingPage.tsx - Elegant Professional Design
import React, { useState } from 'react';
import { useHistory } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Container,
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Fade,
  CardActionArea,
} from '@mui/material';
import {
  Psychology,
  TrendingUp,
  Hub,
  ArrowForward,
  LightMode,
  DarkMode,
} from '@mui/icons-material';

const BEIGE = '#F5F1E8';
const DARK_BG = '#0f172a';
const DARK_CARD = '#1e293b';

const LandingPage: React.FC = () => {
  const history = useHistory();
  const [isDarkMode, setIsDarkMode] = useState(true);

  const handleNavigation = (mode?: 'standard' | 'recommendations', tab?: 'filters' | 'queries') => {
    history.push('/graph', { 
      mode: mode || 'standard',
      tab: tab || 'filters',
      fromLanding: true,
      isDarkMode
    });
  };

  const features = [
    {
      icon: Psychology,
      title: 'Smart Queries',
      description: 'Interact with 3rd party data insights and opportunities using AI-powered analytics',
      gradient: isDarkMode 
        ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(99, 102, 241, 0.1))'
        : 'linear-gradient(135deg, rgba(139, 111, 71, 0.08), rgba(107, 84, 55, 0.05))',
      iconColor: isDarkMode ? '#8b5cf6' : '#8B6F47',
      borderColor: isDarkMode ? 'rgba(139, 92, 246, 0.3)' : 'rgba(139, 111, 71, 0.25)',
      onClick: () => handleNavigation('standard', 'queries')
    },
    {
      icon: TrendingUp,
      title: 'Product Recommendations',
      description: 'Identify best product replacement opportunities based on performance metrics',
      gradient: isDarkMode 
        ? 'linear-gradient(135deg, rgba(245, 158, 11, 0.15), rgba(217, 119, 6, 0.1))'
        : 'linear-gradient(135deg, rgba(180, 83, 9, 0.08), rgba(146, 64, 14, 0.05))',
      iconColor: isDarkMode ? '#f59e0b' : '#B45309',
      borderColor: isDarkMode ? 'rgba(245, 158, 11, 0.3)' : 'rgba(180, 83, 9, 0.25)',
      onClick: () => handleNavigation('recommendations', 'filters')
    },
    {
      icon: Hub,
      title: 'Relationships',
      description: 'Analyze multi-dimensional relationships to identify cross-sell opportunities',
      gradient: isDarkMode 
        ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15), rgba(5, 150, 105, 0.1))'
        : 'linear-gradient(135deg, rgba(4, 120, 87, 0.08), rgba(6, 95, 70, 0.05))',
      iconColor: isDarkMode ? '#10b981' : '#047857',
      borderColor: isDarkMode ? 'rgba(16, 185, 129, 0.3)' : 'rgba(4, 120, 87, 0.25)',
      onClick: () => handleNavigation('standard', 'filters')
    }
  ];

  return (
    <Box
      sx={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: isDarkMode
          ? `linear-gradient(to bottom, ${DARK_BG} 0% 50%, ${DARK_CARD} 50% 100%)`
          : `linear-gradient(to bottom, #FFFFFF 0% 52%, ${BEIGE} 52% 100%)`,
        transition: 'background 0.4s ease'
      }}
    >
      {/* Subtle dotted pattern */}
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: isDarkMode ? 0.05 : 0.03,
          backgroundImage: isDarkMode
            ? 'radial-gradient(circle at 25% 25%, #6366f1 2px, transparent 2px), radial-gradient(circle at 75% 75%, #8b5cf6 2px, transparent 2px)'
            : 'radial-gradient(circle at 25% 25%, #8B6F47 2px, transparent 2px), radial-gradient(circle at 75% 75%, #6B5437 2px, transparent 2px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Theme toggle */}
      <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
        <Tooltip title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'} arrow>
          <IconButton
            onClick={() => setIsDarkMode(v => !v)}
            sx={{
              width: 52,
              height: 52,
              bgcolor: isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(139, 111, 71, 0.1)',
              border: isDarkMode ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(139,111,71,0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'rotate(180deg) scale(1.05)',
                bgcolor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(139, 111, 71, 0.15)',
              }
            }}
          >
            {isDarkMode ? (
              <LightMode sx={{ color: '#fbbf24' }} />
            ) : (
              <DarkMode sx={{ color: '#6366f1' }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          opacity: isDarkMode ? 0.05 : 0.03,
          backgroundImage: isDarkMode
            ? 'radial-gradient(circle at 25% 25%, #6366f1 2px, transparent 2px), radial-gradient(circle at 75% 75%, #8b5cf6 2px, transparent 2px)'
            : 'radial-gradient(circle at 25% 25%, #8B6F47 2px, transparent 2px), radial-gradient(circle at 75% 75%, #6B5437 2px, transparent 2px)',
          backgroundSize: '60px 60px',
        }}
      />

      {/* Theme toggle */}
      <Box sx={{ position: 'absolute', top: 24, right: 24, zIndex: 2 }}>
        <Tooltip title={isDarkMode ? 'Switch to Light Theme' : 'Switch to Dark Theme'} arrow>
          <IconButton
            onClick={() => setIsDarkMode(v => !v)}
            sx={{
              width: 52,
              height: 52,
              bgcolor: isDarkMode ? 'rgba(99, 102, 241, 0.12)' : 'rgba(139, 111, 71, 0.1)',
              border: isDarkMode ? '1px solid rgba(99,102,241,0.25)' : '1px solid rgba(139,111,71,0.2)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: 'rotate(180deg) scale(1.05)',
                bgcolor: isDarkMode ? 'rgba(99, 102, 241, 0.2)' : 'rgba(139, 111, 71, 0.15)',
              }
            }}
          >
            {isDarkMode ? (
              <LightMode sx={{ color: '#fbbf24' }} />
            ) : (
              <DarkMode sx={{ color: '#6366f1' }} />
            )}
          </IconButton>
        </Tooltip>
      </Box>

    
      <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1, py: { xs: 6, md: 10 } }}>
        <Fade in timeout={700}>
          <Box
            sx={{
              display: 'grid',
              gap: { xs: 4, md: 8 },
              gridTemplateColumns: { xs: '1fr', md: '1.1fr 1fr' },
              alignItems: 'start',
            }}
          >
            {/* Left: Welcome Section */}
            <Box>
              <Typography
                variant="h1"
                sx={{
                  fontFamily: '"Playfair Display", Georgia, serif',
                  fontWeight: 700,
                  fontSize: { xs: '3.5rem', md: '6rem' },
                  lineHeight: 1,
                  letterSpacing: '-0.02em',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                  mb: 3,
                  transition: 'color 0.3s ease'
                }}
              >
                Welcome.
              </Typography>

              <Box
                sx={{
                  maxWidth: 560,
                  p: 3,
                  borderRadius: 2,
                  backgroundColor: isDarkMode 
                    ? 'rgba(30, 41, 59, 0.6)' 
                    : 'rgba(255, 255, 255, 0.9)',
                  border: isDarkMode 
                    ? '1px solid rgba(99, 102, 241, 0.2)' 
                    : '1px solid rgba(139, 111, 71, 0.15)',
                  boxShadow: isDarkMode
                    ? '0 8px 24px rgba(0, 0, 0, 0.3)'
                    : '0 8px 24px rgba(0, 0, 0, 0.04)',
                  backdropFilter: 'blur(10px)',
                  transition: 'all 0.3s ease'
                }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.5)' : 'rgba(15, 23, 42, 0.6)',
                    letterSpacing: '0.08em',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                    mb: 1.5,
                  }}
                >
                  SMART NETWORK ANALYTICS
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDarkMode ? 'rgba(255, 255, 255, 0.7)' : 'rgba(15, 23, 42, 0.7)',
                    lineHeight: 1.7,
                    fontSize: '0.9375rem'
                  }}
                >
                  Explore powerful analytics and insights to drive your business forward. 
                  Select a capability below to begin your analysis.
                </Typography>
              </Box>
            </Box>

            {/* Right: Feature Cards */}
            <Box
              sx={{
                width: '100%',
                mx: 'auto',
                borderRadius: 3,
                backgroundColor: isDarkMode 
                  ? 'rgba(17, 24, 39, 0.5)' 
                  : 'rgba(255, 255, 255, 0.95)',
                border: isDarkMode 
                  ? '1px solid rgba(99, 102, 241, 0.2)' 
                  : '1px solid rgba(139, 111, 71, 0.15)',
                boxShadow: isDarkMode
                  ? '0 12px 32px rgba(0, 0, 0, 0.3)'
                  : '0 12px 32px rgba(0, 0, 0, 0.06)',
                p: { xs: 3, md: 3.5 },
                backdropFilter: 'blur(10px)',
                transition: 'all 0.3s ease'
              }}
            >
              <Typography 
                variant="h6" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 3,
                  fontSize: '1.25rem',
                  color: isDarkMode ? '#ffffff' : '#0f172a',
                }}
              >
                Explore Capabilities
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {features.map((feature, index) => (
                  <Card
                    key={index}
                    sx={{
                      borderRadius: 2,
                      border: `1px solid ${feature.borderColor}`,
                      bgcolor: isDarkMode ? 'rgba(30, 41, 59, 0.6)' : '#ffffff',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: isDarkMode
                          ? `0 12px 28px ${feature.iconColor}25`
                          : `0 12px 28px ${feature.iconColor}15`,
                        borderColor: feature.iconColor,
                      },
                    }}
                  >
                    <CardActionArea onClick={feature.onClick}>
                      <CardContent 
                        sx={{ 
                          display: 'flex', 
                          gap: 2.5, 
                          alignItems: 'flex-start',
                          p: 2.5,
                          '&:last-child': { pb: 2.5 }
                        }}
                      >
                        <Box
                          sx={{
                            width: 48,
                            height: 48,
                            borderRadius: 1.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: `1px solid ${feature.borderColor}`,
                            background: feature.gradient,
                            color: feature.iconColor,
                            flexShrink: 0,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <feature.icon sx={{ fontSize: '1.5rem' }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Typography 
                            variant="subtitle1" 
                            sx={{ 
                              fontWeight: 700, 
                              mb: 0.5,
                              fontSize: '1.0625rem',
                              color: isDarkMode ? '#ffffff' : '#0f172a',
                            }}
                          >
                            {feature.title}
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              color: isDarkMode 
                                ? 'rgba(255, 255, 255, 0.7)' 
                                : 'rgba(15, 23, 42, 0.7)',
                              fontSize: '0.875rem',
                              lineHeight: 1.6
                            }}
                          >
                            {feature.description}
                          </Typography>
                        </Box>
                        <Box
                          sx={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: isDarkMode 
                              ? `${feature.iconColor}15` 
                              : `${feature.iconColor}10`,
                            color: feature.iconColor,
                            flexShrink: 0,
                            transition: 'all 0.3s ease',
                          }}
                        >
                          <ArrowForward sx={{ fontSize: '1rem' }} />
                        </Box>
                      </CardContent>
                    </CardActionArea>
                  </Card>
                ))}
              </Box>

              {/* CTA Button */}
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                  variant="contained"
                  onClick={() => handleNavigation('standard', 'filters')}
                  endIcon={<ArrowForward />}
                  sx={{
                    px: 3.5,
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '0.9375rem',
                    borderRadius: 2,
                    textTransform: 'none',
                    bgcolor: isDarkMode ? '#6366f1' : '#8B6F47',
                    color: '#ffffff',
                    boxShadow: isDarkMode 
                      ? '0 4px 16px rgba(99, 102, 241, 0.3)' 
                      : '0 4px 16px rgba(139, 111, 71, 0.25)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      bgcolor: isDarkMode ? '#4f46e5' : '#6B5437',
                      transform: 'translateY(-2px)',
                      boxShadow: isDarkMode 
                        ? '0 8px 24px rgba(99, 102, 241, 0.4)' 
                        : '0 8px 24px rgba(139, 111, 71, 0.35)',
                    },
                  }}
                >
                  Launch Platform
                </Button>
              </Box>
            </Box>
          </Box>
        </Fade>
      </Container>

      {/* Footer */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          borderTop: isDarkMode 
            ? '1px solid rgba(99, 102, 241, 0.1)' 
            : '1px solid rgba(139, 111, 71, 0.1)',
          backdropFilter: 'blur(10px)',
          backgroundColor: isDarkMode 
            ? 'rgba(15, 23, 42, 0.8)' 
            : 'rgba(255, 255, 255, 0.8)',
          py: 2.5,
          px: 3
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 2
            }}
          >
            {/* Left: JPMorgan Chase & Co. */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: isDarkMode 
                    ? 'rgba(255, 255, 255, 0.4)' 
                    : 'rgba(15, 23, 42, 0.5)',
                  fontSize: '0.75rem',
                  fontWeight: 500
                }}
              >
                © 2025 JPMorgan Chase & Co.
              </Typography>
            </Box>

            {/* Right: Feature indicators */}
            <Box
              sx={{
                display: 'flex',
                gap: 3,
                flexWrap: 'wrap',
                justifyContent: 'flex-end'
              }}
            >
              {[
                { label: 'Real-time Analytics', color: '#10b981' },
                { label: 'AI-Powered', color: isDarkMode ? '#8b5cf6' : '#0066b2' },
                { label: 'Secure', color: '#f59e0b' }
              ].map((item, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: item.color,
                      boxShadow: `0 0 8px ${item.color}60`
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      color: isDarkMode 
                        ? 'rgba(255, 255, 255, 0.5)' 
                        : 'rgba(15, 23, 42, 0.6)',
                      fontSize: '0.75rem',
                      fontWeight: 500
                    }}
                  >
                    {item.label}
                  </Typography>
                </Box>
              ))}
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};

export default LandingPage;