import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';

export default function BuyGlassesScreen({ navigation }) {
  const [selectedGlasses, setSelectedGlasses] = useState(null);

  const glassesCategories = [
    {
      id: 1,
      name: 'Prescription Glasses',
      items: [
        {
          id: 101,
          name: 'Classic Rectangle',
          price: '$99',
          description: 'Timeless design for everyday wear',
          color: 'Black',
        },
        {
          id: 102,
          name: 'Modern Round',
          price: '$129',
          description: 'Trendy round frames',
          color: 'Tortoise',
        },
        {
          id: 103,
          name: 'Professional Square',
          price: '$149',
          description: 'Perfect for office wear',
          color: 'Navy Blue',
        },
      ],
    },
    {
      id: 2,
      name: 'Sunglasses',
      items: [
        {
          id: 201,
          name: 'Aviator Classic',
          price: '$159',
          description: 'UV protection with style',
          color: 'Gold',
        },
        {
          id: 202,
          name: 'Sport Wrap',
          price: '$179',
          description: 'For active lifestyle',
          color: 'Black',
        },
      ],
    },
    {
      id: 3,
      name: 'Blue Light Blocking',
      items: [
        {
          id: 301,
          name: 'Digital Shield',
          price: '$89',
          description: 'Reduce eye strain from screens',
          color: 'Clear',
        },
        {
          id: 302,
          name: 'Gaming Pro',
          price: '$119',
          description: 'Enhanced for long gaming sessions',
          color: 'Black',
        },
      ],
    },
  ];

  const handleAddToCart = (item) => {
    Alert.alert(
      'Added to Cart',
      `${item.name} (${item.price}) has been added to your cart.`,
      [
        { text: 'Continue Shopping', style: 'cancel' },
        { text: 'View Cart', onPress: () => {} },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header Banner */}
        <View style={styles.banner}>
          <Text style={styles.bannerTitle}>Find Your Perfect Glasses</Text>
          <Text style={styles.bannerSubtitle}>
            Free shipping on orders over $100
          </Text>
        </View>

        {/* Categories */}
        {glassesCategories.map((category) => (
          <View key={category.id} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{category.name}</Text>

            {category.items.map((item) => (
              <TouchableOpacity
                key={item.id}
                style={styles.itemCard}
                onPress={() => setSelectedGlasses(item)}
              >
                <View style={styles.itemImagePlaceholder}>
                  <Text style={styles.glassesEmoji}>👓</Text>
                </View>

                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemDescription}>
                    {item.description}
                  </Text>
                  <View style={styles.itemDetails}>
                    <Text style={styles.itemColor}>Color: {item.color}</Text>
                    <Text style={styles.itemPrice}>{item.price}</Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => handleAddToCart(item)}
                >
                  <Text style={styles.addButtonText}>Add to Cart</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        ))}

        {/* Virtual Try-On Banner */}
        <View style={styles.tryOnBanner}>
          <Text style={styles.tryOnTitle}>📸 Virtual Try-On</Text>
          <Text style={styles.tryOnText}>
            Use your camera to see how glasses look on you
          </Text>
          <TouchableOpacity style={styles.tryOnButton}>
            <Text style={styles.tryOnButtonText}>Try Now</Text>
          </TouchableOpacity>
        </View>

        {/* Features */}
        <View style={styles.featuresSection}>
          <Text style={styles.featuresTitle}>Why Shop With Us?</Text>
          <View style={styles.featuresList}>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>30-day return policy</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Free prescription lenses</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>1-year warranty included</Text>
            </View>
            <View style={styles.featureItem}>
              <Text style={styles.featureIcon}>✓</Text>
              <Text style={styles.featureText}>Expert support team</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Bottom Cart Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.cartButton}>
          <Text style={styles.cartButtonText}>View Cart (0)</Text>
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
  banner: {
    backgroundColor: '#000',
    padding: 30,
    alignItems: 'center',
  },
  bannerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 8,
  },
  bannerSubtitle: {
    fontSize: 16,
    color: '#ddd',
  },
  categorySection: {
    padding: 20,
  },
  categoryTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  itemImagePlaceholder: {
    width: 80,
    height: 80,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  glassesEmoji: {
    fontSize: 40,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemColor: {
    fontSize: 14,
    color: '#666',
  },
  itemPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  addButton: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 12,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tryOnBanner: {
    backgroundColor: '#e8f4fd',
    margin: 20,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  tryOnTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8,
  },
  tryOnText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
  },
  tryOnButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  tryOnButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  featuresSection: {
    padding: 20,
  },
  featuresTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 16,
  },
  featuresList: {
    gap: 12,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureIcon: {
    fontSize: 20,
    color: '#4CAF50',
    marginRight: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#333',
  },
  bottomBar: {
    borderTopWidth: 1,
    borderTopColor: '#eee',
    padding: 16,
    backgroundColor: '#fff',
  },
  cartButton: {
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  cartButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});