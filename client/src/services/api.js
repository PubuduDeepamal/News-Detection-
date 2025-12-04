import axios from 'axios';

// Base API URL - pointing to our local Llama-powered API server
const API_URL = process.env.REACT_APP_API_URL || 'https://newsdetection.cloud/api';

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const detectFakeNews = async (newsContent) => {
  try {
    const response = await apiClient.post('/detect', { content: newsContent });
    return response.data;
  } catch (error) {
    console.error('Error detecting fake news:', error);
    throw error;
  }
};

// Implement additional API utilities for prompt engineering techniques
export const detectWithChainOfThought = async (newsContent) => {
  try {
    const response = await apiClient.post('/detect/cot', { content: newsContent });
    return response.data;
  } catch (error) {
    console.error('Error with chain of thought detection:', error);
    throw error;
  }
};

export const detectWithZeroShot = async (newsContent) => {
  try {
    const response = await apiClient.post('/detect/zeroshot', { content: newsContent });
    return response.data;
  } catch (error) {
    console.error('Error with zero shot detection:', error);
    throw error;
  }
};

export const detectWithFewShot = async (newsContent) => {
  try {
    const response = await apiClient.post('/detect/fewshot', { content: newsContent });
    return response.data;
  } catch (error) {
    console.error('Error with few shot detection:', error);
    throw error;
  }
};

const apiService = {
  detectFakeNews,
  detectWithChainOfThought,
  detectWithZeroShot,
  detectWithFewShot,
};

export default apiService;
