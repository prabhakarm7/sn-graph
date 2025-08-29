// components/ChatInterface.tsx
import React, { useState, useRef, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  IconButton, 
  Stack, 
  Avatar,
  Chip,
  Card,
  CardContent,
  Divider,
  Fade,
  Grow
} from '@mui/material';
import { 
  Send, 
  SmartToy, 
  Person, 
  AutoAwesome,
  Psychology,
  TrendingUp,
  Assessment
} from '@mui/icons-material';

interface Message {
  id: number;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
  suggestions?: string[];
}

export const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: 1, 
      sender: 'assistant', 
      text: 'Hello! I\'m your AI assistant for network analysis. I can help you understand relationships, identify key influencers, analyze performance metrics, and provide insights about your consultant network.',
      timestamp: new Date(),
      suggestions: [
        'Show me high-performing consultants',
        'Which clients are at risk?',
        'Analyze product ratings',
        'Find strongest relationships'
      ]
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const simulateTyping = async () => {
    setIsTyping(true);
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    setIsTyping(false);
  };

  const handleSendMessage = async () => {
    if (inputText.trim()) {
      const userMessage: Message = {
        id: messages.length + 1,
        sender: 'user',
        text: inputText,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, userMessage]);
      const currentInput = inputText;
      setInputText('');
      
      await simulateTyping();
      
      // Generate contextual response based on input
      const generateResponse = (input: string) => {
        const lowerInput = input.toLowerCase();
        if (lowerInput.includes('consultant') || lowerInput.includes('performance')) {
          return {
            text: 'Based on the current network data, I can see 3 senior consultants with varying performance levels. Senior Consultant 1 appears to have the strongest influence network with 2 field consultants reporting to them. Would you like me to analyze their specific performance metrics or relationship strength?',
            suggestions: ['Show consultant performance details', 'Analyze field consultant coverage', 'Compare consultant influence levels']
          };
        } else if (lowerInput.includes('client') || lowerInput.includes('risk')) {
          return {
            text: 'I\'ve identified several client relationships in the network. Some clients show "Active" mandate status while others may need attention. The system tracks mandate status, influenced consultants, and relationship strength through field consultant coverage.',
            suggestions: ['Show at-risk clients', 'Analyze mandate status trends', 'Review client advisor assignments']
          };
        } else if (lowerInput.includes('product') || lowerInput.includes('rating')) {
          return {
            text: 'The product ratings show a mix of Positive, Negative, and Introduced classifications from various consultants. Each product displays ratings from 2-3 consultants, giving you insight into internal sentiment and market positioning.',
            suggestions: ['Show top-rated products', 'Analyze negative ratings', 'Compare product performance by asset class']
          };
        } else if (lowerInput.includes('relationship') || lowerInput.includes('connection')) {
          return {
            text: 'The network shows various relationship types: EMPLOYS (consultant→field consultant), COVERS (field consultant→client with influence levels 1-4), and OWNS (client→product with mandate status). Edge thickness indicates relationship strength.',
            suggestions: ['Analyze strongest relationships', 'Show influence level distribution', 'Review coverage gaps']
          };
        } else {
          return {
            text: 'I understand your question. Let me analyze the network data and provide insights. The system tracks consultants, field consultants, clients, and products with their interconnected relationships, performance metrics, and influence levels.',
            suggestions: ['Show network overview', 'Analyze key metrics', 'Identify optimization opportunities']
          };
        }
      };

      const response = generateResponse(currentInput);
      const assistantMessage: Message = {
        id: messages.length + 2,
        sender: 'assistant',
        text: response.text,
        timestamp: new Date(),
        suggestions: response.suggestions
      };

      setMessages(prev => [...prev, assistantMessage]);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputText(suggestion);
    inputRef.current?.focus();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 2 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
        <Avatar sx={{ 
          bgcolor: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)', 
          width: 40, 
          height: 40 
        }}>
          <SmartToy />
        </Avatar>
        <Box>
          <Typography variant="h6" sx={{ color: 'white', fontWeight: 'bold', lineHeight: 1 }}>
            AI Network Analyst
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)' }}>
            Online • Ready to analyze
          </Typography>
        </Box>
        <Box sx={{ flexGrow: 1 }} />
        <Chip
          icon={<AutoAwesome />}
          label="Pro"
          size="small"
          sx={{
            bgcolor: 'rgba(251, 191, 36, 0.2)',
            color: '#fbbf24',
            border: '1px solid rgba(251, 191, 36, 0.3)'
          }}
        />
      </Box>
      
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 2 }} />
      
      {/* Messages Container */}
      <Box sx={{ 
        flexGrow: 1, 
        mb: 2, 
        maxHeight: 'calc(100vh - 300px)', 
        overflowY: 'auto',
        pr: 1,
        '&::-webkit-scrollbar': {
          width: '4px',
        },
        '&::-webkit-scrollbar-track': {
          background: 'rgba(255, 255, 255, 0.05)',
          borderRadius: '2px',
        },
        '&::-webkit-scrollbar-thumb': {
          background: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '2px',
          '&:hover': {
            background: 'rgba(255, 255, 255, 0.3)',
          }
        },
      }}>
        <Stack spacing={2}>
          {messages.map((msg, index) => (
            <Grow key={msg.id} in timeout={500} style={{ transitionDelay: `${index * 100}ms` }}>
              <Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1.5,
                    flexDirection: msg.sender === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <Avatar 
                    sx={{ 
                      width: 32, 
                      height: 32,
                      bgcolor: msg.sender === 'user' 
                        ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                      fontSize: '0.9rem'
                    }}
                  >
                    {msg.sender === 'user' ? <Person /> : <Psychology />}
                  </Avatar>
                  
                  <Box sx={{ 
                    maxWidth: '85%', 
                    minWidth: '200px',
                    display: 'flex', 
                    flexDirection: 'column',
                    alignItems: msg.sender === 'user' ? 'flex-end' : 'flex-start'
                  }}>
                    <Card
                      sx={{
                        bgcolor: msg.sender === 'user' 
                          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.15) 0%, rgba(5, 150, 105, 0.15) 100%)' 
                          : 'rgba(255, 255, 255, 0.08)',
                        border: `1px solid ${msg.sender === 'user' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
                        backdropFilter: 'blur(10px)',
                        width: 'fit-content',
                        maxWidth: '100%'
                      }}
                    >
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography 
                          variant="body2" 
                          sx={{ 
                            color: 'white', 
                            fontSize: '0.9rem',
                            lineHeight: 1.5,
                            wordBreak: 'break-word'
                          }}
                        >
                          {msg.text}
                        </Typography>
                      </CardContent>
                    </Card>
                    
                    <Typography 
                      variant="caption" 
                      sx={{ 
                        color: 'rgba(255, 255, 255, 0.5)', 
                        mt: 0.5,
                        fontSize: '0.7rem'
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </Typography>
                    
                    {/* Suggestions for assistant messages */}
                    {msg.sender === 'assistant' && msg.suggestions && (
                      <Box sx={{ mt: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {msg.suggestions.map((suggestion, idx) => (
                          <Fade key={idx} in timeout={1000} style={{ transitionDelay: `${(idx + 1) * 200}ms` }}>
                            <Chip
                              label={suggestion}
                              size="small"
                              onClick={() => handleSuggestionClick(suggestion)}
                              sx={{
                                bgcolor: 'rgba(99, 102, 241, 0.1)',
                                color: '#6366f1',
                                border: '1px solid rgba(99, 102, 241, 0.2)',
                                fontSize: '0.7rem',
                                height: 24,
                                '&:hover': {
                                  bgcolor: 'rgba(99, 102, 241, 0.2)',
                                  cursor: 'pointer'
                                },
                                transition: 'all 0.2s ease'
                              }}
                            />
                          </Fade>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Box>
              </Box>
            </Grow>
          ))}
          
          {/* Typing Indicator */}
          {isTyping && (
            <Fade in timeout={300}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32,
                  bgcolor: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                }}>
                  <Psychology />
                </Avatar>
                <Card sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)'
                }}>
                  <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                      <Box sx={{ 
                        width: 8, height: 8, borderRadius: '50%', 
                        bgcolor: '#6366f1',
                        animation: 'pulse 1.5s ease-in-out infinite'
                      }} />
                      <Box sx={{ 
                        width: 8, height: 8, borderRadius: '50%', 
                        bgcolor: '#6366f1',
                        animation: 'pulse 1.5s ease-in-out infinite 0.3s'
                      }} />
                      <Box sx={{ 
                        width: 8, height: 8, borderRadius: '50%', 
                        bgcolor: '#6366f1',
                        animation: 'pulse 1.5s ease-in-out infinite 0.6s'
                      }} />
                      <Typography variant="caption" sx={{ color: 'rgba(255, 255, 255, 0.7)', ml: 1 }}>
                        Analyzing...
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Box>
            </Fade>
          )}
          
          <div ref={messagesEndRef} />
        </Stack>
      </Box>
      
      {/* Quick Actions */}
      <Box sx={{ mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
          <Chip
            icon={<TrendingUp />}
            label="Performance"
            size="small"
            onClick={() => handleSuggestionClick('Analyze consultant performance metrics')}
            sx={{
              bgcolor: 'rgba(16, 185, 129, 0.1)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.2)',
              '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.2)' }
            }}
          />
          <Chip
            icon={<Assessment />}
            label="Relationships"
            size="small"
            onClick={() => handleSuggestionClick('Show relationship strength analysis')}
            sx={{
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              color: '#3b82f6',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' }
            }}
          />
        </Stack>
      </Box>
      
      {/* Input Container */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          multiline
          maxRows={3}
          size="small"
          placeholder="Ask about network relationships, performance metrics, or insights..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={handleKeyPress}
          disabled={isTyping}
          sx={{
            '& .MuiOutlinedInput-root': {
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              color: 'white',
              borderRadius: 3,
              border: '1px solid rgba(255, 255, 255, 0.2)',
              backdropFilter: 'blur(10px)',
              '& fieldset': { border: 'none' },
              '&:hover': { 
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                border: '1px solid rgba(255, 255, 255, 0.3)'
              },
              '&.Mui-focused': { 
                bgcolor: 'rgba(255, 255, 255, 0.12)',
                border: '2px solid #6366f1',
                boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.1)'
              },
              '&.Mui-disabled': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                opacity: 0.7
              }
            },
            '& .MuiInputBase-input': {
              color: 'white',
              fontSize: '0.9rem',
              padding: '12px 16px',
              '&::placeholder': { 
                color: 'rgba(255, 255, 255, 0.6)',
                opacity: 1
              }
            }
          }}
        />
        <IconButton 
          onClick={handleSendMessage}
          disabled={!inputText.trim() || isTyping}
          sx={{ 
            bgcolor: inputText.trim() && !isTyping ? '#6366f1' : 'rgba(255, 255, 255, 0.1)', 
            color: 'white',
            borderRadius: 3,
            p: 1.5,
            minWidth: 48,
            height: 48,
            '&:hover': { 
              bgcolor: inputText.trim() && !isTyping ? '#4f46e5' : 'rgba(255, 255, 255, 0.15)',
              transform: 'scale(1.05)'
            },
            '&:disabled': {
              color: 'rgba(255, 255, 255, 0.4)',
              transform: 'scale(1)'
            },
            transition: 'all 0.2s ease',
            boxShadow: inputText.trim() && !isTyping ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
          }}
        >
          <Send fontSize="small" />
        </IconButton>
      </Box>
      
      {/* CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0%, 80%, 100% {
              opacity: 0.3;
              transform: scale(0.8);
            }
            40% {
              opacity: 1;
              transform: scale(1);
            }
          }
        `}
      </style>
    </Box>
  );
};