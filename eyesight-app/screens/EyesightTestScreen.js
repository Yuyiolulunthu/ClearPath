import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';

export default function EyesightTestScreen({ navigation }) {
  const [currentTest, setCurrentTest] = useState(0);
  const [answers, setAnswers] = useState([]);

  const tests = [
    {
      id: 1,
      type: 'vision',
      question: 'Can you read this letter clearly?',
      letter: 'E',
      size: 80,
      options: ['E', 'F', 'P', 'T'],
      correct: 'E',
    },
    {
      id: 2,
      type: 'vision',
      question: 'Which direction is the letter C opening?',
      letter: 'C',
      size: 60,
      options: ['Left', 'Right', 'Up', 'Down'],
      correct: 'Right',
    },
    {
      id: 3,
      type: 'color',
      question: 'What number do you see in this circle?',
      description: 'Color blindness test',
      number: '12',
      options: ['12', '21', '15', 'No number'],
      correct: '12',
    },
  ];

  const handleAnswer = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (currentTest < tests.length - 1) {
      setCurrentTest(currentTest + 1);
    } else {
      // Calculate results
      let correctCount = 0;
      tests.forEach((test, index) => {
        if (newAnswers[index] === test.correct) {
          correctCount++;
        }
      });

      const score = Math.round((correctCount / tests.length) * 100);
      Alert.alert(
        'Test Complete!',
        `Your score: ${score}%\n${correctCount} out of ${tests.length} correct`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    }
  };

  const test = tests[currentTest];

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Progress */}
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>
            Question {currentTest + 1} of {tests.length}
          </Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${((currentTest + 1) / tests.length) * 100}%` },
              ]}
            />
          </View>
        </View>

        {/* Question */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionText}>{test.question}</Text>
          {test.description && (
            <Text style={styles.descriptionText}>{test.description}</Text>
          )}
        </View>

        {/* Test Display */}
        <View style={styles.testDisplay}>
          {test.type === 'vision' ? (
            <Text style={[styles.testLetter, { fontSize: test.size }]}>
              {test.letter}
            </Text>
          ) : (
            <View style={styles.colorTestCircle}>
              <Text style={styles.colorTestNumber}>{test.number}</Text>
            </View>
          )}
        </View>

        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Instructions:</Text>
          <Text style={styles.instructionsText}>
            • Sit at arm's length from your screen{'\n'}
            • Ensure good lighting{'\n'}
            • Remove glasses if you wear them{'\n'}
            • Cover one eye and read with the other
          </Text>
        </View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {test.options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={styles.optionButton}
              onPress={() => handleAnswer(option)}
            >
              <Text style={styles.optionText}>{option}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  progressContainer: {
    marginBottom: 30,
  },
  progressText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    textAlign: 'center',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#000',
    borderRadius: 4,
  },
  questionContainer: {
    marginBottom: 30,
  },
  questionText: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  testDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    marginBottom: 30,
  },
  testLetter: {
    fontWeight: '700',
    color: '#000',
  },
  colorTestCircle: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#f0e68c',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 10,
    borderColor: '#daa520',
  },
  colorTestNumber: {
    fontSize: 48,
    fontWeight: '700',
    color: '#8b4513',
  },
  instructionsContainer: {
    backgroundColor: '#f0f8ff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 30,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 22,
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#000',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
});