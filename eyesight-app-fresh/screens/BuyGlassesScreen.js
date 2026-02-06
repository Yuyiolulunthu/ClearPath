import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  StatusBar,
} from 'react-native';

export default function VisionCareScreen({ navigation }) {
  // Simulating the 3-Tier Model logic
  const standardStock = [
    { id: 1, type: 'Myopia', frames: 'Standard A (Small)', range: '-1.00D to -3.00D' },
    { id: 2, type: 'Myopia', frames: 'Standard B (Medium)', range: '-3.25D to -5.00D' },
    { id: 3, type: 'Hyperopia', frames: 'Standard C (Adjustable)', range: '+1.00D to +3.00D' },
  ];

  const handleStartRefraction = () => {
    Alert.alert(
      'Medical Disclaimer',
      'This smartphone refraction technology is a screening aid and cannot fully replace a clinical diagnosis by an ophthalmologist. If high astigmatism or eye disease risks are detected, the system will refer you to a professional optometrist.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'I Understand & Agree', onPress: () => console.log('Start Refraction') }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1A73E8" />
      <ScrollView showsVerticalScrollIndicator={false}>
        
        {/* Header: Project Mission & Impact */}
        <View style={styles.impactHeader}>
          <Text style={styles.impactTitle}>Vision Care Access</Text>
          <Text style={styles.impactSubtitle}>Breaking the poverty cycle through accessible vision care.</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statNum}>$200</Text>
              <Text style={styles.statLabel}>Mobile Tech Cost</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statBox}>
              <Text style={styles.statNum}>80%+</Text>
              <Text style={styles.statLabel}>Target Coverage</Text>
            </View>
          </View>
        </View>

        {/* Tier 1: Core Detection (Smartphone Refraction) */}
        <View style={styles.mainActionSection}>
          <Text style={styles.sectionTitle}>1. Core Detection</Text>
          <TouchableOpacity 
            style={styles.refractionCard}
            onPress={handleStartRefraction}
          >
            <View style={styles.iconContainer}>
              <Text style={styles.refractionIcon}>📱</Text>
            </View>
            <View style={styles.textContainer}>
              <Text style={styles.refractionTitle}>Start AI Refraction</Text>
              <Text style={styles.refractionDesc}>
                Replaces $20k equipment.{'\n'}Screening in 5 mins.
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Tier 2: School Stock Assignment */}
        <View style={styles.inventorySection}>
          <Text style={styles.sectionTitle}>2. School Stock Assignment</Text>
          <Text style={styles.sectionSubtitle}>Immediate correction for standard cases</Text>
          
          {standardStock.map((item) => (
            <View key={item.id} style={styles.stockItem}>
              <View style={styles.stockInfo}>
                <Text style={styles.stockName}>{item.type} • {item.frames}</Text>
                <Text style={styles.stockRange}>Range: {item.range}</Text>
              </View>
              <TouchableOpacity style={styles.applyButton}>
                <Text style={styles.applyButtonText}>Assign</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>

        {/* Tier 3: Professional Safety Net */}
        <View style={styles.proSection}>
          <Text style={styles.sectionTitle}>3. Professional Safety Net</Text>
          <View style={styles.proCard}>
            <View style={styles.proHeader}>
              <Text style={styles.warningIcon}>⚠️</Text>
              <Text style={styles.proText}>Complex refractive error detected?</Text>
            </View>
            <Text style={styles.proSubText}>
              Cases outside standard stock range require professional attention.
            </Text>
            <TouchableOpacity style={styles.referralButton}>
              <Text style={styles.referralButtonText}>Refer to Mobile Optometrist</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Legal / Medical Disclaimer */}
        <View style={styles.disclaimerBox}>
          <Text style={styles.disclaimerTitle}>MEDICAL DISCLAIMER</Text>
          <Text style={styles.disclaimerText}>
            This application uses smartphone-based technology to estimate refractive errors. It is designed to increase accessibility in low-resource settings but does not replace a comprehensive eye exam by a licensed professional. Results may vary based on environmental lighting and user operation.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  
  // Header Styles
  impactHeader: {
    backgroundColor: '#1A73E8', // Medical Blue
    paddingTop: 40,
    paddingBottom: 30,
    paddingHorizontal: 25,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  impactTitle: { fontSize: 26, fontWeight: '800', color: '#FFF', letterSpacing: 0.5 },
  impactSubtitle: { fontSize: 15, color: '#E1F5FE', marginTop: 8, lineHeight: 22 },
  statsRow: { 
    flexDirection: 'row', 
    marginTop: 25, 
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 15,
    borderRadius: 12
  },
  statBox: { alignItems: 'center', flex: 1 },
  statDivider: { width: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  statNum: { fontSize: 22, fontWeight: '800', color: '#FFF' },
  statLabel: { fontSize: 12, color: '#E1F5FE', marginTop: 4, textTransform: 'uppercase' },
  
  // Section Headers
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 24, marginBottom: 8, marginHorizontal: 20, color: '#202124' },
  sectionSubtitle: { fontSize: 13, color: '#5F6368', marginBottom: 12, marginHorizontal: 20 },

  // Tier 1 Styles
  mainActionSection: { paddingHorizontal: 20 },
  refractionCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    shadowColor: '#1A73E8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#E8F0FE',
  },
  iconContainer: {
    width: 60, height: 60, borderRadius: 30, backgroundColor: '#E8F0FE',
    alignItems: 'center', justifyContent: 'center', marginRight: 16
  },
  refractionIcon: { fontSize: 30 },
  textContainer: { flex: 1 },
  refractionTitle: { fontSize: 18, fontWeight: '700', color: '#1A73E8', marginBottom: 4 },
  refractionDesc: { fontSize: 13, color: '#5F6368', lineHeight: 18 },

  // Tier 2 Styles
  inventorySection: { paddingHorizontal: 20 },
  stockItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#34A853', // Health Green
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  stockInfo: { flex: 1 },
  stockName: { fontSize: 16, fontWeight: '600', color: '#333' },
  stockRange: { fontSize: 13, color: '#666', marginTop: 4 },
  applyButton: { backgroundColor: '#34A853', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 8 },
  applyButtonText: { color: '#FFF', fontWeight: '700', fontSize: 13 },

  // Tier 3 Styles
  proSection: { paddingHorizontal: 20 },
  proCard: { 
    backgroundColor: '#FFF8E1', 
    padding: 20, 
    borderRadius: 16, 
    borderWidth: 1,
    borderColor: '#FFE082'
  },
  proHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  warningIcon: { marginRight: 8, fontSize: 16 },
  proText: { fontSize: 16, fontWeight: '700', color: '#F57C00' },
  proSubText: { fontSize: 13, color: '#E65100', marginBottom: 16, lineHeight: 18 },
  referralButton: { backgroundColor: '#FF9800', padding: 14, borderRadius: 8, alignItems: 'center' },
  referralButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },

  // Disclaimer Styles
  disclaimerBox: { 
    margin: 20, 
    padding: 16, 
    backgroundColor: '#F1F3F4', 
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0'
  },
  disclaimerTitle: { fontSize: 12, fontWeight: '800', color: '#5F6368', marginBottom: 6, letterSpacing: 0.5 },
  disclaimerText: { fontSize: 11, color: '#70757A', lineHeight: 16, textAlign: 'justify' },
});