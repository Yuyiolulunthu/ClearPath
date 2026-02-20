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
      comment: '測試流程專業，結果詳細，品質評分很有參考價值！',
    },
    {
      id: 2,
      name: 'Bob Wang',
      rating: 4,
      comment: '視標動態縮放很厲害，測試體驗很好',
    },
    {
      id: 3,
      name: 'Carol Lin',
      rating: 5,
      comment: 'LCA 和 DoF 校正讓結果更準確，值得信賴',
    },
  ]);

  const articles = [
    {
      id: 1,
      icon: '📐',
      title: '系統架構說明',
      abstract: '技術文檔',
      content: '了解完整的五大核心模組：距離估測、視標控制、視力測試、屈光轉換、品質控制。',
      badge: '專業',
      color: '#e3f2fd',
    },
    {
      id: 2,
      icon: '🔬',
      title: '測量原理解析',
      abstract: '科學原理',
      content: '深入理解幾何光學模型、LCA校正、DoF線性校正等核心技術。',
      badge: '進階',
      color: '#f3e5f5',
    },
    {
      id: 3,
      icon: '💡',
      title: '使用最佳實踐',
      abstract: '操作指南',
      content: '如何保持穩定距離、選擇良好光線環境，獲得最準確的測量結果。',
      badge: '必讀',
      color: '#fff3e0',
    },
  ];

  // 模擬最近測試結果
  const recentTest = {
    date: '2024-02-20',
    eye: 'right',
    spherical: -2.15,
    visualAcuity: '20/25',
    logMAR: 0.10,
    quality: 92,
    grade: 'EXCELLENT',
  };

  const renderStars = (rating) => {
    return '⭐'.repeat(rating);
  };

  const getQualityColor = (grade) => {
    const colors = {
      'EXCELLENT': '#4CAF50',
      'GOOD': '#8BC34A',
      'FAIR': '#FFC107',
      'POOR': '#FF9800',
    };
    return colors[grade] || '#666';
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>👤</Text>
            </View>
            <View>
              <Text style={styles.userName}>專業視力檢測</Text>
              <Text style={styles.userId}>Professional Vision Testing</Text>
            </View>
          </View>
          <View style={styles.proBadge}>
            <Text style={styles.proText}>Pro</Text>
          </View>
        </View>

        {/* Featured Banner */}
        <View style={styles.newsSection}>
          <View style={styles.bannerContent}>
            <Text style={styles.bannerTitle}>🔬 技術驅動的精準測量</Text>
            <Text style={styles.bannerSubtitle}>
              基於光學原理與計算機視覺的專業系統
            </Text>
            <View style={styles.techBadges}>
              <View style={styles.techBadge}>
                <Text style={styles.techBadgeText}>d = k/s</Text>
              </View>
              <View style={styles.techBadge}>
                <Text style={styles.techBadgeText}>LCA + DoF</Text>
              </View>
              <View style={styles.techBadge}>
                <Text style={styles.techBadgeText}>Staircase</Text>
              </View>
            </View>
          </View>
          <View style={styles.dotsContainer}>
            <View style={[styles.dot, styles.activeDot]} />
            <View style={styles.dot} />
            <View style={styles.dot} />
          </View>
        </View>

        {/* Terms */}
        <TouchableOpacity style={styles.termsButton}>
          <Text style={styles.termsIcon}>⚠️</Text>
          <Text style={styles.termsText}>
            本系統為研究輔助工具，測量結果僅供參考
          </Text>
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.button, styles.primaryButton]}
            onPress={() => navigation.navigate('EyesightTest')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>👁️</Text>
            <Text style={styles.buttonText}>開始專業檢測</Text>
            <Text style={styles.buttonSubtext}>完整測量流程</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.secondaryButton]}
            onPress={() => navigation.navigate('BuyGlasses')}
            activeOpacity={0.8}
          >
            <Text style={styles.buttonIcon}>🕶️</Text>
            <Text style={styles.buttonText}>選購眼鏡</Text>
            <Text style={styles.buttonSubtext}>專業配鏡</Text>
          </TouchableOpacity>
        </View>

        {/* Test Results */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>最近測試結果</Text>
          <Text style={styles.sectionSubtitle}>
            {recentTest.date} · {recentTest.eye === 'right' ? '右眼' : '左眼'}
          </Text>

          <View style={styles.resultsGrid}>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>屈光度</Text>
              <Text style={styles.resultValue}>
                {recentTest.spherical.toFixed(2)}
              </Text>
              <Text style={styles.resultUnit}>D</Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>視力</Text>
              <Text style={styles.resultValue}>
                {recentTest.visualAcuity}
              </Text>
              <Text style={styles.resultUnit}>
                {recentTest.logMAR.toFixed(2)} logMAR
              </Text>
            </View>
            <View style={styles.resultCard}>
              <Text style={styles.resultLabel}>品質分數</Text>
              <Text style={[
                styles.resultValue,
                { color: getQualityColor(recentTest.grade) }
              ]}>
                {recentTest.quality}
              </Text>
              <Text style={styles.resultUnit}>{recentTest.grade}</Text>
            </View>
          </View>

          {/* Technical Details */}
          <View style={styles.technicalCard}>
            <Text style={styles.technicalTitle}>📊 測量詳情</Text>
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>LCA 校正</Text>
              <Text style={styles.technicalValue}>✓ 已套用 (0.70D)</Text>
            </View>
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>DoF 校正</Text>
              <Text style={styles.technicalValue}>✓ 線性模型</Text>
            </View>
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>測量次數</Text>
              <Text style={styles.technicalValue}>3 次</Text>
            </View>
            <View style={styles.technicalRow}>
              <Text style={styles.technicalLabel}>重測穩定度</Text>
              <Text style={styles.technicalValue}>±0.24 D (95% CI)</Text>
            </View>
          </View>
        </View>

        {/* System Features */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>核心技術模組</Text>
          <Text style={styles.sectionSubtitle}>五大專業子系統</Text>

          <View style={styles.featuresGrid}>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>📏</Text>
              <Text style={styles.featureTitle}>距離估測</Text>
              <Text style={styles.featureFormula}>d = k / s</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🎯</Text>
              <Text style={styles.featureTitle}>視標控制</Text>
              <Text style={styles.featureFormula}>H(t) = α₀·d(t)</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>👁️</Text>
              <Text style={styles.featureTitle}>視力測試</Text>
              <Text style={styles.featureFormula}>Staircase</Text>
            </View>
            <View style={styles.featureCard}>
              <Text style={styles.featureIcon}>🔬</Text>
              <Text style={styles.featureTitle}>屈光轉換</Text>
              <Text style={styles.featureFormula}>v = -1/d</Text>
            </View>
          </View>
        </View>

        {/* Helpful Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>知識中心</Text>

          {articles.map((article) => (
            <TouchableOpacity
              key={article.id}
              style={[styles.articleItem, { backgroundColor: article.color }]}
              onPress={() => navigation.navigate('Article', { article })}
              activeOpacity={0.7}
            >
              <View style={styles.articleIconContainer}>
                <Text style={styles.articleIcon}>{article.icon}</Text>
              </View>
              <View style={styles.articleContent}>
                <View style={styles.articleHeader}>
                  <Text style={styles.articleAbstract}>{article.abstract}</Text>
                  <View style={styles.articleBadge}>
                    <Text style={styles.articleBadgeText}>{article.badge}</Text>
                  </View>
                </View>
                <Text style={styles.articleTitle}>{article.title}</Text>
                <Text style={styles.articleDescription} numberOfLines={2}>
                  {article.content}
                </Text>
              </View>
              <Text style={styles.articleArrow}>›</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Technical Specs */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>技術規格</Text>
          
          <View style={styles.specsCard}>
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>測量範圍</Text>
              <Text style={styles.specValue}>-10D ~ +5D</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>視標類型</Text>
              <Text style={styles.specValue}>Landolt C</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>測試方法</Text>
              <Text style={styles.specValue}>Staircase 自適應</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>校正方式</Text>
              <Text style={styles.specValue}>LCA + DoF</Text>
            </View>
            <View style={styles.specDivider} />
            <View style={styles.specRow}>
              <Text style={styles.specLabel}>品質控制</Text>
              <Text style={styles.specValue}>0-100 分評分</Text>
            </View>
          </View>
        </View>

        {/* User Feedback */}
        <View style={styles.section}>
          <View style={styles.feedbackHeader}>
            <View>
              <Text style={styles.sectionTitle}>用戶評價</Text>
              <Text style={styles.sectionSubtitle}>來自真實用戶的反饋</Text>
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

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {feedbacks.map((feedback) => (
              <View key={feedback.id} style={styles.feedbackCard}>
                <View style={styles.feedbackTop}>
                  <View style={styles.feedbackAvatarContainer}>
                    <View style={styles.feedbackAvatar}>
                      <Text style={styles.feedbackAvatarText}>
                        {feedback.name.charAt(0)}
                      </Text>
                    </View>
                    <Text style={styles.feedbackName}>{feedback.name}</Text>
                  </View>
                  <Text style={styles.feedbackRating}>
                    {renderStars(feedback.rating)}
                  </Text>
                </View>
                <Text style={styles.feedbackComment}>{feedback.comment}</Text>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Disclaimer */}
        <View style={styles.section}>
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>⚠️ 重要聲明</Text>
            <Text style={styles.disclaimerText}>
              本系統為研究和輔助工具，測量結果僅供參考。
              實際配鏡前請諮詢合格的眼科醫師或驗光師。
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
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#f0f0f0',
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 24,
  },
  userName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  userId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  proBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  proText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  
  // Featured Banner
  newsSection: {
    backgroundColor: '#000',
    padding: 24,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
  },
  bannerContent: {
    marginBottom: 20,
  },
  bannerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 16,
  },
  techBadges: {
    flexDirection: 'row',
    gap: 8,
  },
  techBadge: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  techBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  activeDot: {
    backgroundColor: '#fff',
    width: 24,
  },
  
  // Terms
  termsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff3e0',
    borderRadius: 8,
  },
  termsIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  termsText: {
    fontSize: 13,
    color: '#f57c00',
  },
  
  // Action Buttons
  actionButtons: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginBottom: 30,
  },
  button: {
    flex: 1,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    backgroundColor: '#000',
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
  },
  buttonIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  buttonSubtext: {
    fontSize: 12,
    opacity: 0.7,
  },
  
  // Section
  section: {
    paddingHorizontal: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 16,
  },
  
  // Results Grid
  resultsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  resultCard: {
    flex: 1,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
  },
  resultLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
  },
  resultValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000',
    marginBottom: 4,
  },
  resultUnit: {
    fontSize: 11,
    color: '#999',
  },
  
  // Technical Card
  technicalCard: {
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
  },
  technicalTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 12,
  },
  technicalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  technicalLabel: {
    fontSize: 13,
    color: '#666',
  },
  technicalValue: {
    fontSize: 13,
    color: '#000',
    fontWeight: '600',
  },
  
  // Features Grid
  featuresGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  featureCard: {
    width: (SCREEN_WIDTH - 52) / 2,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  featureTitle: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 6,
    textAlign: 'center',
  },
  featureFormula: {
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: '#666',
    backgroundColor: '#fff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  
  // Article Items
  articleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  articleIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  articleIcon: {
    fontSize: 24,
  },
  articleContent: {
    flex: 1,
  },
  articleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  articleAbstract: {
    fontSize: 12,
    color: '#666',
    marginRight: 8,
  },
  articleBadge: {
    backgroundColor: '#000',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  articleBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  articleDescription: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },
  articleArrow: {
    fontSize: 28,
    color: '#ccc',
    marginLeft: 8,
  },
  
  // Specs Card
  specsCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  specLabel: {
    fontSize: 14,
    color: '#666',
  },
  specValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  specDivider: {
    height: 1,
    backgroundColor: '#eee',
  },
  
  // Feedback
  feedbackHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
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
    width: 280,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 12,
    marginRight: 12,
  },
  feedbackTop: {
    marginBottom: 12,
  },
  feedbackAvatarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  feedbackAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  feedbackAvatarText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  feedbackName: {
    fontSize: 16,
    fontWeight: '600',
  },
  feedbackRating: {
    fontSize: 16,
  },
  feedbackComment: {
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  
  // Disclaimer
  disclaimerCard: {
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
  },
  disclaimerTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  disclaimerText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
});