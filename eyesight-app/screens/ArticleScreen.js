import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
} from 'react-native';

export default function ArticleScreen({ route, navigation }) {
  const { article } = route.params;

  const handleShare = async () => {
    try {
      await Share.share({
        message: `${article.title}\n\n${article.content}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Article Header */}
        <View style={styles.header}>
          <Text style={styles.icon}>{article.icon}</Text>
          <Text style={styles.title}>{article.title}</Text>
          <View style={styles.meta}>
            <Text style={styles.metaText}>5 min read</Text>
            <Text style={styles.metaDot}>•</Text>
            <Text style={styles.metaText}>Updated today</Text>
          </View>
        </View>

        {/* Article Content */}
        <View style={styles.content}>
          <Text style={styles.paragraph}>{article.content}</Text>

          <Text style={styles.subheading}>Key Points:</Text>
          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Regular eye check-ups are essential for maintaining good vision
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Follow the 20-20-20 rule: Every 20 minutes, look at something 20 feet away for 20 seconds
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Protect your eyes from UV rays with proper sunglasses
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Maintain a healthy diet rich in vitamins A, C, and E
              </Text>
            </View>
          </View>

          <Text style={styles.subheading}>Prevention Tips:</Text>
          <Text style={styles.paragraph}>
            Taking care of your eyes is crucial for long-term vision health. 
            Make sure to schedule regular eye exams, especially if you spend 
            long hours in front of screens. Computer vision syndrome is 
            becoming increasingly common in our digital age.
          </Text>

          <Text style={styles.paragraph}>
            Proper lighting is also important. Avoid reading or working in 
            dim light, and ensure your workspace has adequate illumination. 
            Position your screen about an arm's length away and slightly 
            below eye level.
          </Text>

          <Text style={styles.subheading}>When to See a Doctor:</Text>
          <Text style={styles.paragraph}>
            If you experience any of the following symptoms, consult an eye 
            care professional immediately:
          </Text>

          <View style={styles.bulletList}>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Sudden vision loss or blurriness</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Eye pain or discomfort</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Persistent headaches</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Seeing flashes of light or floaters</Text>
            </View>
          </View>
        </View>

        {/* Related Articles */}
        <View style={styles.relatedSection}>
          <Text style={styles.relatedTitle}>Related Articles</Text>
          <TouchableOpacity style={styles.relatedItem}>
            <Text style={styles.relatedIcon}>👁️</Text>
            <View style={styles.relatedContent}>
              <Text style={styles.relatedItemTitle}>
                Understanding Eye Strain
              </Text>
              <Text style={styles.relatedItemSubtitle}>3 min read</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.relatedItem}>
            <Text style={styles.relatedIcon}>🥕</Text>
            <View style={styles.relatedContent}>
              <Text style={styles.relatedItemTitle}>
                Foods for Better Vision
              </Text>
              <Text style={styles.relatedItemSubtitle}>4 min read</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.actionBar}>
        <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
          <Text style={styles.actionButtonText}>📤 Share</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButtonPrimary}>
          <Text style={styles.actionButtonTextPrimary}>🔖 Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  icon: {
    fontSize: 60,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 14,
    color: '#999',
  },
  metaDot: {
    fontSize: 14,
    color: '#999',
    marginHorizontal: 8,
  },
  content: {
    padding: 20,
  },
  paragraph: {
    fontSize: 16,
    lineHeight: 26,
    color: '#333',
    marginBottom: 20,
  },
  subheading: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 16,
  },
  bulletList: {
    marginBottom: 20,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 16,
    color: '#000',
    marginRight: 12,
    marginTop: 2,
  },
  bulletText: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  relatedSection: {
    padding: 20,
    backgroundColor: '#f9f9f9',
  },
  relatedTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  relatedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  relatedIcon: {
    fontSize: 32,
    marginRight: 16,
  },
  relatedContent: {
    flex: 1,
  },
  relatedItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  relatedItemSubtitle: {
    fontSize: 14,
    color: '#999',
  },
  actionBar: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#eee',
    backgroundColor: '#fff',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#000',
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  actionButtonPrimary: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  actionButtonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
  },
});