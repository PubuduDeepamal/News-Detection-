import React from 'react';
import './ExplanationComponent.css';

const ExplanationComponent = ({ explanation, factors }) => {
  return (
    <div className="explanation-component">
      <div className="explanation-text">
        <h3>Detailed Explanation:</h3>
        <p>{explanation}</p>
      </div>
      
      <div className="explanation-factors">
        <h3>Analysis Factors:</h3>
        <ul className="factors-list">
          {factors.map((factor, index) => (
            <li key={index} className="factor-item">
              <div className="factor-bullet"></div>
              <div className="factor-content">{factor}</div>
            </li>
          ))}
        </ul>
      </div>
      
      <div className="explanation-notes">
        <h3>About Our Analysis:</h3>
        <p>
          Our system uses advanced large language models to analyze content and identify potential fake news.
          The analysis considers multiple factors including linguistic patterns, factual consistency, and contextual relevance.
        </p>
        <p>
          While our system is highly accurate, we recommend cross-checking information with reputable sources.
          Not all misleading content is 100% false - some may contain partial truths mixed with misinformation.
        </p>
      </div>
    </div>
  );
};

export default ExplanationComponent;
