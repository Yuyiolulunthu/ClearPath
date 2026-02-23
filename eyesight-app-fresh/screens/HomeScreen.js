import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [feedbacks, setFeedbacks] = useState([
    {
      id: 1,
      name: 'Alice Chen',
      rating: 5,
      comment: 'Professional testing process with detailed quality scoring. Highly recommended!',
    },
    {
      id: 2,
      name: 'Bob Wang',
      rating: 5,
      comment: 'The dynamic optotype scaling is amazing. Very accurate results.',
    },
    {
      id: 3,
      name: 'Carol Lin',
      rating: 4,
      comment: 'LCA and DoF corrections make the results more reliable.',
    },
  ]);

  const recentTest = {
    date: 'Feb 20, 2024',
    eye: 'Right Eye',
    spherical: -2.15,
    visualAcuity: '20/25',
    logMAR: 0.10,
    quality: 92,
    grade: 'EXCELLENT',
  };

  const features = [
    {
      icon: '📏',
      title: 'Distance Estimation',
      subtitle: 'Geometric optical model',
      formula: 'd = k / s',
      color: '#667eea',
    },
    {
      icon: '🎯',
      title: 'Optotype Control',
      subtitle: 'Constant visual angle',
      formula: 'H(t) = α₀·d(t)',
      color: '#f093fb',
    },
    {
      icon: '👁️',
      title: 'Visual Acuity',
      subtitle: 'Adaptive staircase',
      formula: 'logMAR',
      color: '#4facfe',
    },
    {
      icon: '🔬',
      title: 'Refraction',
      subtitle: 'LCA + DoF correction',
      formula: 'v = -1/d',
      color: '#43e97b',
    },
  ];

  const articles = [
    {
      id: 1,
      icon: '🛡️',
      title: 'Risk & Safeguards',
      description: 'Multi-layered safety system and screening protocols',
      badge: 'Safety',
      color: '#fee',
      route: 'RiskSafeguards',
    },
    {
      id: 2,
      icon: '📚',
      title: 'System Architecture',
      description: 'Learn about the five core modules and technical specifications',
      badge: 'Technical',
      color: '#e3f2fd',
    },
    {
      id: 3,
      icon: '🔬',
      title: 'Measurement Principles',
      description: 'Understanding optical models and refraction calculations',
      badge: 'Advanced',
      color: '#f3e5f5',
    },
    {
      id: 4,
      icon: '💡',
      title: 'Best Practices',
      description: 'Tips for achieving the most accurate measurements',
      badge: 'Guide',
      color: '#fff3e0',
    },
  ];

  const renderStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  const getQualityColor = (grade) => {
    const colors = {
      'EXCELLENT': '#10b981',
      'GOOD': '#84cc16',
      'FAIR': '#f59e0b',
      'POOR': '#ef4444',
    };
    return colors[grade] || '#666';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      
      {/* Modern Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Vision Testing</Text>
          <Text style={styles.headerSubtitle}>Professional Eye Care</Text>
        </View>
        <View style={styles.proBadge}>
          <Text style={styles.proText}>PRO</Text>
        </View>
      </View>

      <ScrollView 
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.heroCard}>
            <Text style={styles.heroTitle}>Precision Vision Testing</Text>
            <Text style={styles.heroSubtitle}>
              Advanced optical analysis with AI-powered measurements
            </Text>
            <View style={styles.heroBadges}>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Landolt C</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>Staircase</Text>
              </View>
              <View style={styles.heroBadge}>
                <Text style={styles.heroBadgeText}>0-100 QC</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={() => navigation.navigate('EyesightTest')}
            activeOpacity={0.85}
          >
            <View style={styles.actionIcon}>
              <Text style={styles.actionIconText}>👁️</Text>
            </View>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Start Professional Test</Text>
              <Text style={styles.actionSubtitle}>
                Complete vision & refraction measurement
              </Text>
            </View>
            <Text style={styles.actionArrow}>→</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActions}>
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={() => navigation.navigate('BuyGlasses')}
              activeOpacity={0.85}
            >
              <View style={styles.secondaryIcon}>
                <Text style={styles.secondaryIconText}>🕶️</Text>
              </View>
              <Text style={styles.secondaryTitle}>Shop Glasses</Text>
              <Text style={styles.secondarySubtitle}>Premium eyewear</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryAction}
              activeOpacity={0.85}
            >
              <View style={styles.secondaryIcon}>
                <Text style={styles.secondaryIconText}>📊</Text>
              </View>
              <Text style={styles.secondaryTitle}>Test History</Text>
              <Text style={styles.secondarySubtitle}>View records</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Latest Test Result */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Latest Test Result</Text>
            <TouchableOpacity>
              <Text style={styles.seeAll}>See All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.testResultCard}>
            <View style={styles.testHeader}>
              <View>
                <Text style={styles.testDate}>{recentTest.date}</Text>
                <Text style={styles.testEye}>{recentTest.eye}</Text>
              </View>
              <View style={[
                styles.qualityBadge,
                { backgroundColor: getQualityColor(recentTest.grade) }
              ]}>
                <Text style={styles.qualityText}>{recentTest.quality}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Refraction</Text>
                <Text style={styles.metricValue}>
                  {recentTest.spherical.toFixed(2)}
                </Text>
                <Text style={styles.metricUnit}>D</Text>
              </View>
              
              <View style={styles.metricDivider} />
              
              <View style={styles.metric}>
                <Text style={styles.metricLabel}>Visual Acuity</Text>
                <Text style={styles.metricValue}>
                  {recentTest.visualAcuity}
                </Text>
                <Text style={styles.metricUnit}>
                  {recentTest.logMAR.toFixed(2)} logMAR
                </Text>
              </View>
            </View>

            <View style={styles.testFooter}>
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Quality Grade:</Text>
                <Text style={[
                  styles.footerValue,
                  { color: getQualityColor(recentTest.grade) }
                ]}>
                  {recentTest.grade}
                </Text>
              </View>
              <View style={styles.footerRow}>
                <Text style={styles.footerLabel}>Corrections:</Text>
                <Text style={styles.footerValue}>LCA + DoF</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Core Technologies */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Core Technologies</Text>
          <Text style={styles.sectionSubtitle}>
            Advanced optical and computational methods
          </Text>

          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.featureCard, { borderLeftColor: feature.color }]}
                activeOpacity={0.85}
              >
                <Text style={styles.featureIcon}>{feature.icon}</Text>
                <Text style={styles.featureTitle}>{feature.title}</Text>
                <Text style={styles.featureSubtitle}>{feature.subtitle}</Text>
                <View style={styles.formulaBadge}>
                  <Text style={styles.formulaText}>{feature.formula}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Technical Specifications */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Technical Specifications</Text>
          
          <View style={styles.specsCard}>
            <View style={styles.specRow}>
              <View style={styles.specLeft}>
                <Text style={styles.specIcon}>📐</Text>
                <Text style={styles.specLabel}>Measurement Range</Text>
              </View>
              <Text style={styles.specValue}>-10D to +5D</Text>
            </View>
            
            <View style={styles.specDivider} />
            
            <View style={styles.specRow}>
              <View style={styles.specLeft}>
                <Text style={styles.specIcon}>🎯</Text>
                <Text style={styles.specLabel}>Optotype Type</Text>
              </View>
              <Text style={styles.specValue}>Landolt C</Text>
            </View>
            
            <View style={styles.specDivider} />
            
            <View style={styles.specRow}>
              <View style={styles.specLeft}>
                <Text style={styles.specIcon}>📊</Text>
                <Text style={styles.specLabel}>Test Method</Text>
              </View>
              <Text style={styles.specValue}>Adaptive Staircase</Text>
            </View>
            
            <View style={styles.specDivider} />
            
            <View style={styles.specRow}>
              <View style={styles.specLeft}>
                <Text style={styles.specIcon}>🔬</Text>
                <Text style={styles.specLabel}>Corrections</Text>
              </View>
              <Text style={styles.specValue}>LCA + DoF</Text>
            </View>
            
            <View style={styles.specDivider} />
            
            <View style={styles.specRow}>
              <View style={styles.specLeft}>
                <Text style={styles.specIcon}>✓</Text>
                <Text style={styles.specLabel}>Quality Control</Text>
              </View>
              <Text style={styles.specValue}>0-100 Score</Text>
            </View>
          </View>
        </View>

        {/* Knowledge Base */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Knowledge Base</Text>
          
          {articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleCard, { backgroundColor: article.color }]}
              onPress={() => {
                if (article.route) {
                  navigation.navigate(article.route);
                } else {
                  navigation.navigate('Article', { article });
                }
              }}
              activeOpacity={0.85}
            >
              <View style={styles.articleIconContainer}>
                <Text style={styles.articleIcon}>{article.icon}</Text>
              </View>
              
              <View style={styles.articleContent}>
                <View style={styles.articleTop}>
                  <Text style={styles.articleTitle}>{article.title}</Text>
                  <View style={styles.articleBadge}>
                    <Text style={styles.articleBadgeText}>{article.badge}</Text>
                  </View>
                </View>
                <Text style={styles.articleDescription} numberOfLines={2}>
                  {article.description}
                </Text>
              </View>
              
              <Text style={styles.articleArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* User Reviews */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>User Reviews</Text>
              <Text style={styles.sectionSubtitle}>
                What our users say
              </Text>
            </View>
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

          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.reviewsScroll}
          >
            {feedbacks.map((feedback) => (
              <View key={feedback.id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.reviewAvatar}>
                    <Text style={styles.reviewAvatarText}>
                      {feedback.name.split(' ').map(n => n[0]).join('')}
                    </Text>
                  </View>
                  <View style={styles.reviewInfo}>
                    <Text style={styles.reviewName}>{feedback.name}</Text>
                    <Text style={styles.reviewRating}>
                      {renderStars(feedback.rating)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.reviewComment}>{feedback.comment}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Disclaimer */}
        <View style={styles.section}>
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerIcon}>⚠️</Text>
            <Text style={styles.disclaimerTitle}>Important Notice</Text>
            <Text style={styles.disclaimerText}>
              This system is a research and assistive tool. Results are for reference only. 
              Please consult a qualified optometrist before getting prescription glasses.
            </Text>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  proText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  
  scrollContent: {
    paddingBottom: 20,
  },
  
  // Hero Section
  heroSection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  heroCard: {
    backgroundColor: '#000',
    borderRadius: 24,
    padding: 28,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 8,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 20,
    lineHeight: 22,
  },
  heroBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  heroBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Section
  section: {
    paddingHorizontal: 20,
    marginTop: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#000',
    letterSpacing: -0.5,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 15,
    color: '#000',
    fontWeight: '600',
  },
  
  // Primary Action
  primaryAction: {
    backgroundColor: '#000',
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  actionIconText: {
    fontSize: 28,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 4,
  },
  actionSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  actionArrow: {
    fontSize: 28,
    color: '#fff',
    marginLeft: 12,
  },
  
  // Secondary Actions
  secondaryActions: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryAction: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  secondaryIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9fa',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  secondaryIconText: {
    fontSize: 24,
  },
  secondaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  secondarySubtitle: {
    fontSize: 13,
    color: '#666',
  },
  
  // Test Result Card
  testResultCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  testHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  testDate: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  testEye: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  qualityBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  qualityText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  metricsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#000',
    marginBottom: 4,
  },
  metricUnit: {
    fontSize: 11,
    color: '#999',
  },
  metricDivider: {
    width: 1,
    backgroundColor: '#e5e7eb',
    marginHorizontal: 16,
  },
  testFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    gap: 8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerLabel: {
    fontSize: 14,
    color: '#666',
  },
  footerValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  
  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
  },
  featureIcon: {
    fontSize: 36,
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
    textAlign: 'center',
  },
  featureSubtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
    textAlign: 'center',
  },
  formulaBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  formulaText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#000',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  
  // Specs Card
  specsCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  specLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  specIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  specLabel: {
    fontSize: 15,
    color: '#333',
  },
  specValue: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
  },
  specDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  
  // Article Cards
  articleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  articleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  articleIcon: {
    fontSize: 28,
  },
  articleContent: {
    flex: 1,
    marginLeft: 16,
  },
  articleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  articleTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginRight: 8,
  },
  articleBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  articleBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.5,
  },
  articleDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  articleArrow: {
    fontSize: 28,
    color: '#ccc',
    marginLeft: 12,
  },
  
  // Reviews
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '300',
  },
  reviewsScroll: {
    paddingRight: 20,
  },
  reviewCard: {
    width: 300,
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  reviewAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reviewAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  reviewInfo: {
    flex: 1,
  },
  reviewName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 2,
  },
  reviewRating: {
    fontSize: 14,
  },
  reviewComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // Disclaimer
  disclaimerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
    borderLeftColor: '#f59e0b',
  },
  disclaimerIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  disclaimerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 21,
  },
});