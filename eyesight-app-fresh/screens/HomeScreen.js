import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Image,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

export default function HomeScreen({ navigation }) {
  const [feedbacks, setFeedbacks] = useState([
    {
      id: 1,
      name: 'Alice',
      rating: 5,
      comment: 'The test was quick and easy!',
    },
    {
      id: 2,
      name: 'Bob',
      rating: 4,
      comment: 'I loved the detailed results',
    },
  ]);

  const articles = [
    {
      id: 1,
      icon: '🕶️',
      title: 'Article 1',
      abstract: 'Abstract',
      content: 'Tips for maintaining good eye health and preventing eye strain from digital devices.',
    },
    {
      id: 2,
      icon: '💧',
      title: 'Article 2',
      abstract: 'Abstract',
      content: 'Understanding the importance of regular eye check-ups and early detection of vision problems.',
    },
    {
      id: 3,
      icon: '💡',
      title: 'Article 3',
      abstract: 'Abstract',
      content: 'How to choose the right glasses for your face shape and lifestyle needs.',
    },
  ];

  const renderStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar} />
            <View>
              <Text style={styles.userName}>UserName</Text>
              <Text style={styles.userId}>id</Text>
            </View>
          </View>
        </View>

        {/* News & Ads */}
        <View style={styles.newsSection}>
          <Text style={styles.newsTitle}>News & ads</Text>
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsIcon}>☐</Text>
          <Text style={styles.termsText}>Terms of Service & Disclaimer</Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.blackButton]}
            onPress={() => navigation.navigate('EyesightTest')}
          >
            <Text style={styles.buttonText}>Start eyesight test</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.blackButton]}
            onPress={() => navigation.navigate('BuyGlasses')}
          >
            <Text style={styles.buttonText}>Buy Glasses</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Test Results</Text>
          <Text style={styles.sectionSubtitle}>Your previous tests</Text>

          <View style={styles.resultsContainer}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Last Test Date</Text>
              <Text style={styles.resultValue}>2023-10-15</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Vision Score</Text>
              <Text style={styles.resultValue}>20/20</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>Color Blind</Text>
              <Text style={styles.resultValue}>Passed</Text>
            </View>
          </View>
        </View>

        {/* Helpful Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Helpful Tips</Text>

          {articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={styles.articleItem}
              onPress={() => navigation.navigate('Article', { article })}
            >
              <Text style={styles.articleIcon}>{article.icon}</Text>
              <View style={styles.articleContent}>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleAbstract}>{article.abstract}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* User Feedback */}
        <View style={styles.section}>
          <View style={styles.feedbackHeader}>
            <Text style={styles.sectionTitle}>User Feedback</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('AddFeedback', { 
                onAddFeedback: (newFeedback) => {
                  setFeedbacks([...feedbacks, { ...newFeedback, id: feedbacks.length + 1 }]);
                }
              })}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {feedbacks.map((feedback) => (
              <View key={feedback.id} style={styles.feedbackCard}>
                <View style={styles.feedbackHeader}>
                  <View style={styles.feedbackAvatar} />
                  <Text style={styles.feedbackName}>{feedback.name}</Text>
                </View>
                <Text style={styles.feedbackRating}>
                  {renderStars(feedback.rating)}
                </Text>
                <Text style={styles.feedbackComment}>{feedback.comment}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#ddd',
    marginRight: 12,
  },
  userName: {
    fontSize: 18,
    fontWeight: '600',
  },
  userId: {
    fontSize: 14,
    color: '#999',
    marginTop: 2,
  },
  newsSection: {
    backgroundColor: '#f5f5f5',
    padding: 40,
    marginHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
  },
  newsTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 30,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ddd',
  },
  activeDot: {
    backgroundColor: '#666',
  },
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  termsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  termsText: {
    fontSize: 14,
    color: '#333',
  },
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  blackButton: {
    backgroundColor: '#000',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#999',
    marginBottom: 16,
  },
  resultsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  resultCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  articleIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  articleContent: {
    flex: 1,
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  articleAbstract: {
    fontSize: 14,
    color: '#999',
  },
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  feedbackCard: {
    width: 220,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  feedbackAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ddd',
    marginRight: 10,
  },
  feedbackName: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackRating: {
    fontSize: 16,
    marginVertical: 8,
  },
  feedbackComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
});