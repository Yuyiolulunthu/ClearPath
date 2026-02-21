import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function VisionCareScreen({ navigation }) {
  const [selectedRegion, setSelectedRegion] = useState('India');

  // Standard lens inventory based on project specs
  const lensInventory = [
    { power: '-0.50D', stock: 'High', cost: '$5.00' },
    { power: '-1.00D', stock: 'High', cost: '$5.00' },
    { power: '-1.50D', stock: 'High', cost: '$5.00' },
    { power: '-2.00D', stock: 'Medium', cost: '$5.00' },
    { power: '-2.50D', stock: 'Medium', cost: '$5.00' },
    { power: '-3.00D', stock: 'Medium', cost: '$5.00' },
    { power: '-3.50D', stock: 'Low', cost: '$5.00' },
    { power: '-4.00D', stock: 'Low', cost: '$5.00' },
    { power: '-4.50D', stock: 'Low', cost: '$5.00' },
    { power: '-5.00D', stock: 'Low', cost: '$5.00' },
    { power: '-5.50D', stock: 'Low', cost: '$5.00' },
    { power: '-6.00D', stock: 'Low', cost: '$5.00' },
  ];

  // Frame sizes based on project specs
  const frameSizes = [
    { size: 'Small', target: 'Children (6-10 yrs)', width: '120-125mm', cost: '$2.50' },
    { size: 'Medium', target: 'Teens (11-16 yrs)', width: '130-135mm', cost: '$2.50' },
    { size: 'Large', target: 'Adults (17+ yrs)', width: '140-145mm', cost: '$2.50' },
  ];

  // Delivery options based on project specs
  const deliveryOptions = [
    {
      name: 'Standard Single Pair',
      description: 'One pair based on measurement',
      cost: '$7.00',
      includes: ['Frame ($2.50)', 'Lenses ($5.00)', 'Shipping ($3.00)', 'System ($2.00)'],
    },
    {
      name: 'Range Delivery (3 Pairs)',
      description: 'Three power options to choose from',
      cost: '$15.00',
      includes: ['Frame ($2.50)', '3 Lens Sets ($7.50)', 'Shipping ($3.00)', 'System ($2.00)'],
      recommended: true,
    },
    {
      name: 'Return Option',
      description: 'Unused lenses returnable',
      cost: '$7.00 + return shipping',
      includes: ['Base package', 'Return materials', 'Refund policy'],
    },
  ];

  // Regional hubs
  const regionalHubs = [
    { region: 'South Asia', location: 'Tamil Nadu, India', status: 'Active', coverage: '65%' },
    { region: 'Southeast Asia', location: 'Pending', status: 'Planned', coverage: '-' },
    { region: 'Africa', location: 'Pending', status: 'Planned', coverage: '-' },
    { region: 'South America', location: 'Pending', status: 'Planned', coverage: '-' },
  ];

  const handleStartRefraction = () => {
    Alert.alert(
      'Medical Disclaimer',
      'This smartphone refraction technology is a screening aid and cannot fully replace clinical diagnosis by an ophthalmologist. Complex cases will be referred to professional optometrists.\n\nDo you understand and agree?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'I Understand & Agree',
          onPress: () => navigation.navigate('EyesightTest'),
        },
      ]
    );
  };

  const getStockColor = (stock) => {
    const colors = {
      High: '#10b981',
      Medium: '#f59e0b',
      Low: '#ef4444',
    };
    return colors[stock] || '#666';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Vision Care Access</Text>
          <Text style={styles.heroSubtitle}>
            Breaking the poverty cycle through accessible vision care
          </Text>

          <View style={styles.impactStats}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>$200</Text>
              <Text style={styles.statLabel}>Mobile Tech Cost</Text>
              <Text style={styles.statCompare}>vs $20,000 traditional</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>80%+</Text>
              <Text style={styles.statLabel}>Target Coverage</Text>
              <Text style={styles.statCompare}>Low-resource areas</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* System Architecture Overview */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>System Architecture</Text>
            <View style={styles.architectureCard}>
              {[
                { num: '1', name: 'Smartphone Refraction', icon: '📱' },
                { num: '2', name: 'Risk Screening', icon: '⚕️' },
                { num: '3', name: 'Standardized Lenses', icon: '👓' },
                { num: '4', name: 'Modular Frames', icon: '🔧' },
                { num: '5', name: 'Delivery & Returns', icon: '📦' },
              ].map((module, i) => (
                <View key={i} style={styles.moduleItem}>
                  <View style={styles.moduleNumber}>
                    <Text style={styles.moduleNumberText}>{module.num}</Text>
                  </View>
                  <Text style={styles.moduleIcon}>{module.icon}</Text>
                  <Text style={styles.moduleName}>{module.name}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Primary Action: Start Refraction */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 1: Core Detection</Text>
            <TouchableOpacity
              style={styles.primaryActionCard}
              onPress={handleStartRefraction}
              activeOpacity={0.85}
            >
              <View style={styles.actionIcon}>
                <Text style={styles.actionIconText}>📱</Text>
              </View>
              <View style={styles.actionContent}>
                <Text style={styles.actionTitle}>Start AI Refraction Test</Text>
                <Text style={styles.actionSubtitle}>
                  Replaces $20k equipment • 5-minute screening
                </Text>
              </View>
              <Text style={styles.actionArrow}>→</Text>
            </TouchableOpacity>
          </View>

          {/* Lens System Specifications */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Step 2: Standardized Lens System</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>0.50D Intervals</Text>
              </View>
            </View>
            
            <View style={styles.specCard}>
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Lens Size</Text>
                <Text style={styles.specValue}>50mm (Fixed)</Text>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Power Range</Text>
                <Text style={styles.specValue}>-0.50D to -6.00D</Text>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Interval</Text>
                <Text style={styles.specValue}>0.50D steps</Text>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Material</Text>
                <Text style={styles.specValue}>CR-39 / Resin</Text>
              </View>
              <View style={styles.specDivider} />
              <View style={styles.specRow}>
                <Text style={styles.specLabel}>Coating</Text>
                <Text style={styles.specValue}>UV + Basic Hard</Text>
              </View>
            </View>

            <Text style={styles.inventoryTitle}>Current Inventory</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.inventoryScroll}
            >
              {lensInventory.map((lens, i) => (
                <View key={i} style={styles.lensCard}>
                  <Text style={styles.lensPower}>{lens.power}</Text>
                  <View style={[styles.stockBadge, { backgroundColor: getStockColor(lens.stock) }]}>
                    <Text style={styles.stockText}>{lens.stock}</Text>
                  </View>
                  <Text style={styles.lensCost}>{lens.cost}</Text>
                </View>
              ))}
            </ScrollView>
          </View>

          {/* Frame System */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 3: Modular Frame System</Text>
            
            {frameSizes.map((frame, i) => (
              <View key={i} style={styles.frameCard}>
                <View style={styles.frameHeader}>
                  <Text style={styles.frameSize}>{frame.size}</Text>
                  <Text style={styles.frameCost}>{frame.cost}</Text>
                </View>
                <Text style={styles.frameTarget}>{frame.target}</Text>
                <Text style={styles.frameWidth}>Width: {frame.width}</Text>
              </View>
            ))}

            <View style={styles.infoBox}>
              <Text style={styles.infoIcon}>ℹ️</Text>
              <Text style={styles.infoText}>
                App recommends size based on facial measurements or self-selection
              </Text>
            </View>
          </View>

          {/* Delivery Options */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Step 4: Delivery Options</Text>
            
            {deliveryOptions.map((option, i) => (
              <View
                key={i}
                style={[
                  styles.deliveryCard,
                  option.recommended && styles.deliveryCardRecommended,
                ]}
              >
                {option.recommended && (
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedText}>RECOMMENDED</Text>
                  </View>
                )}
                <View style={styles.deliveryHeader}>
                  <Text style={styles.deliveryName}>{option.name}</Text>
                  <Text style={styles.deliveryCost}>{option.cost}</Text>
                </View>
                <Text style={styles.deliveryDescription}>{option.description}</Text>
                
                <View style={styles.includesList}>
                  {option.includes.map((item, idx) => (
                    <View key={idx} style={styles.includeItem}>
                      <Text style={styles.includeDot}>•</Text>
                      <Text style={styles.includeText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Regional Hubs */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Step 5: Regional Distribution</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Phase 2</Text>
              </View>
            </View>

            {regionalHubs.map((hub, i) => (
              <View key={i} style={styles.hubCard}>
                <View style={styles.hubHeader}>
                  <Text style={styles.hubRegion}>{hub.region}</Text>
                  <View
                    style={[
                      styles.hubStatus,
                      { backgroundColor: hub.status === 'Active' ? '#10b981' : '#666' },
                    ]}
                  >
                    <Text style={styles.hubStatusText}>{hub.status}</Text>
                  </View>
                </View>
                <Text style={styles.hubLocation}>📍 {hub.location}</Text>
                <Text style={styles.hubCoverage}>Coverage: {hub.coverage}</Text>
              </View>
            ))}
          </View>

          {/* Safety & Screening */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Safety & Risk Screening</Text>
            
            <View style={styles.safetyCard}>
              <View style={styles.safetyHeader}>
                <Text style={styles.safetyIcon}>⚕️</Text>
                <Text style={styles.safetyTitle}>Automatic Screening System</Text>
              </View>
              
              <View style={styles.safetyList}>
                {[
                  'Visual acuity abnormality detection',
                  'High astigmatism risk exclusion',
                  'Amblyopia & strabismus alerts',
                  'Visual discomfort reporting',
                  'Professional optometrist review backup',
                ].map((item, i) => (
                  <View key={i} style={styles.safetyItem}>
                    <Text style={styles.safetyCheck}>✓</Text>
                    <Text style={styles.safetyText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.warningCard}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.warningTitle}>Complex Cases Detected?</Text>
              <Text style={styles.warningText}>
                Cases outside standard range require professional attention.
                System will automatically refer to mobile optometrist network.
              </Text>
              <TouchableOpacity style={styles.referralButton}>
                <Text style={styles.referralButtonText}>View Referral Network</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Cost Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Cost Structure</Text>
            
            <View style={styles.costCard}>
              <Text style={styles.costTitle}>Standard Single Pair</Text>
              <View style={styles.costBreakdown}>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Frame</Text>
                  <Text style={styles.costValue}>$2.50</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Lenses (2 pcs)</Text>
                  <Text style={styles.costValue}>$5.00</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>Packaging & Shipping</Text>
                  <Text style={styles.costValue}>$3.00</Text>
                </View>
                <View style={styles.costRow}>
                  <Text style={styles.costLabel}>System & Operations</Text>
                  <Text style={styles.costValue}>$2.00</Text>
                </View>
                <View style={styles.costDivider} />
                <View style={styles.costRow}>
                  <Text style={styles.costTotal}>Total Cost</Text>
                  <Text style={styles.costTotalValue}>$7.00</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Legal Disclaimer */}
          <View style={styles.disclaimerCard}>
            <Text style={styles.disclaimerTitle}>MEDICAL DISCLAIMER</Text>
            <Text style={styles.disclaimerText}>
              This application uses smartphone-based technology to estimate refractive errors. 
              It is designed to increase accessibility in low-resource settings but does not 
              replace a comprehensive eye exam by a licensed professional. Results may vary 
              based on environmental lighting and user operation.
              {'\n\n'}
              System goal: Serve mild refractive errors and refer high-risk cases to professionals.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  scrollContent: {
    paddingBottom: 40,
  },

  // Hero Section
  heroSection: {
    backgroundColor: '#000',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 12,
    letterSpacing: -1,
  },
  heroSubtitle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    lineHeight: 24,
    marginBottom: 32,
  },
  impactStats: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  statValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    marginBottom: 4,
  },
  statCompare: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.6)',
  },

  // Content Section
  contentSection: {
    paddingHorizontal: 20,
    backgroundColor: '#fafafa',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    marginTop: -20,
    paddingTop: 32,
  },

  // Section
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  badge: {
    backgroundColor: '#000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },

  // Architecture
  architectureCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  moduleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  moduleNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  moduleNumberText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  moduleIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  moduleName: {
    fontSize: 15,
    color: '#333',
    flex: 1,
    fontWeight: '600',
  },

  // Primary Action
  primaryActionCard: {
    backgroundColor: '#000',
    borderRadius: 20,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
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

  // Spec Card
  specCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  specRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  specLabel: {
    fontSize: 15,
    color: '#666',
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

  // Inventory
  inventoryTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  inventoryScroll: {
    paddingRight: 20,
  },
  lensCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginRight: 12,
    width: 100,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  lensPower: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginBottom: 8,
  },
  stockText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  lensCost: {
    fontSize: 13,
    color: '#666',
  },

  // Frame Cards
  frameCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
    borderLeftColor: '#10b981',
  },
  frameHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  frameSize: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  frameCost: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  frameTarget: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  frameWidth: {
    fontSize: 13,
    color: '#999',
  },

  // Info Box
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#e3f2fd',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  infoIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#1976d2',
    lineHeight: 20,
  },

  // Delivery Cards
  deliveryCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  deliveryCardRecommended: {
    borderWidth: 2,
    borderColor: '#10b981',
  },
  recommendedBadge: {
    backgroundColor: '#10b981',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    marginBottom: 12,
  },
  recommendedText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  deliveryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  deliveryName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
  },
  deliveryCost: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  deliveryDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  includesList: {
    gap: 6,
  },
  includeItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  includeDot: {
    fontSize: 14,
    color: '#10b981',
    marginRight: 8,
    marginTop: 2,
  },
  includeText: {
    flex: 1,
    fontSize: 13,
    color: '#333',
    lineHeight: 20,
  },

  // Hub Cards
  hubCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  hubHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  hubRegion: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
  },
  hubStatus: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  hubStatusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  hubLocation: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
  },
  hubCoverage: {
    fontSize: 13,
    color: '#999',
  },

  // Safety
  safetyCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  safetyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  safetyIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  safetyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
  },
  safetyList: {
    gap: 12,
  },
  safetyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  safetyCheck: {
    fontSize: 16,
    color: '#10b981',
    marginRight: 12,
    marginTop: 2,
  },
  safetyText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },

  // Warning
  warningCard: {
    backgroundColor: '#fff3e0',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#ffe082',
  },
  warningIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  warningTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#f57c00',
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: '#e65100',
    lineHeight: 20,
    marginBottom: 16,
  },
  referralButton: {
    backgroundColor: '#ff9800',
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  referralButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  // Cost Breakdown
  costCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  costTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },
  costBreakdown: {
    gap: 12,
  },
  costRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  costLabel: {
    fontSize: 15,
    color: '#666',
  },
  costValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#000',
  },
  costDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
    marginVertical: 4,
  },
  costTotal: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
  costTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
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
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  disclaimerText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 20,
  },
});