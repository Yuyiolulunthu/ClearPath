import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function RiskSafeguardsScreen({ navigation }) {
  const [expandedSection, setExpandedSection] = useState(null);

  // Risk categories and screening criteria
  const riskCategories = [
    {
      id: 1,
      icon: '⚠️',
      title: 'High Refractive Error',
      severity: 'HIGH',
      criteria: [
        'Myopia > -6.00D',
        'Hyperopia > +3.00D',
        'Measurement uncertainty > ±0.75D',
      ],
      action: 'Automatic referral to professional optometrist',
      color: '#ef4444',
    },
    {
      id: 2,
      icon: '👁️',
      title: 'Astigmatism Detection',
      severity: 'HIGH',
      criteria: [
        'Cylinder power > 1.00D',
        'Irregular astigmatism pattern',
        'Asymmetric corneal reflection',
      ],
      action: 'Requires professional diagnosis',
      color: '#ef4444',
    },
    {
      id: 3,
      icon: '📊',
      title: 'Visual Acuity Abnormality',
      severity: 'MEDIUM',
      criteria: [
        'Best corrected VA < 20/40',
        'Significant left-right difference',
        'Inconsistent responses',
      ],
      action: 'Extended testing protocol + review',
      color: '#f59e0b',
    },
    {
      id: 4,
      icon: '🔍',
      title: 'Amblyopia Risk',
      severity: 'HIGH',
      criteria: [
        'Age < 12 years with VA < 20/30',
        'Anisometropia > 1.50D',
        'Strabismus indicators',
      ],
      action: 'Immediate pediatric ophthalmology referral',
      color: '#ef4444',
    },
    {
      id: 5,
      icon: '💡',
      title: 'Measurement Quality',
      severity: 'MEDIUM',
      criteria: [
        'Quality score < 70/100',
        'Poor lighting conditions',
        'Face tracking instability',
      ],
      action: 'Request re-test under better conditions',
      color: '#f59e0b',
    },
  ];

  // Screening protocol layers
  const screeningLayers = [
    {
      layer: 'Pre-Test Screening',
      checks: [
        'Age verification (6+ years)',
        'Previous eye surgery history',
        'Current eye disease symptoms',
        'Medication affecting vision',
      ],
      gatekeeper: 'Questionnaire-based exclusion',
    },
    {
      layer: 'During-Test Monitoring',
      checks: [
        'Real-time quality metrics',
        'Distance stability tracking',
        'Response consistency analysis',
        'Geometric stability verification',
      ],
      gatekeeper: 'AI-powered live monitoring',
    },
    {
      layer: 'Post-Test Analysis',
      checks: [
        'Statistical outlier detection',
        'Cross-validation of measurements',
        'Threshold reasonableness check',
        'Quality grade assessment',
      ],
      gatekeeper: 'Automated algorithm review',
    },
    {
      layer: 'Professional Review',
      checks: [
        'Licensed optometrist verification',
        'Complex case consultation',
        'Borderline result arbitration',
        'Final prescription approval',
      ],
      gatekeeper: 'Human expert oversight',
    },
  ];

  // Safety mechanisms
  const safetyMechanisms = [
    {
      icon: '🛡️',
      title: 'Automatic Risk Flagging',
      description: 'AI system flags high-risk cases in real-time during testing',
      coverage: '100% of tests',
    },
    {
      icon: '👨‍⚕️',
      title: 'Professional Network',
      description: 'Direct referral to network of verified mobile optometrists',
      coverage: 'Regional hubs',
    },
    {
      icon: '📞',
      title: 'Emergency Consultation',
      description: '24/7 hotline for vision-threatening symptoms',
      coverage: 'All users',
    },
    {
      icon: '🔄',
      title: 'Follow-up Protocol',
      description: 'Mandatory 2-week comfort check for all prescriptions',
      coverage: '100% of dispensed glasses',
    },
    {
      icon: '📋',
      title: 'Data Monitoring',
      description: 'Continuous analysis of success rates and adverse events',
      coverage: 'System-wide',
    },
  ];

  // Exclusion criteria
  const exclusionCriteria = [
    {
      category: 'Medical History',
      items: [
        'Active eye infection or inflammation',
        'Recent eye surgery (< 6 months)',
        'Diagnosed glaucoma or cataracts',
        'Retinal disease or macular degeneration',
        'Diabetic retinopathy',
      ],
    },
    {
      category: 'Symptoms',
      items: [
        'Sudden vision loss',
        'Flashes of light or floaters',
        'Eye pain or redness',
        'Double vision',
        'Progressive vision deterioration',
      ],
    },
    {
      category: 'Demographics',
      items: [
        'Age < 6 years (developing vision)',
        'Age > 65 years (age-related conditions)',
        'Pregnant (hormonal vision changes)',
      ],
    },
  ];

  // Success metrics
  const successMetrics = [
    { metric: 'False Positive Rate', target: '< 5%', current: '3.2%', status: 'good' },
    { metric: 'False Negative Rate', target: '< 2%', current: '1.8%', status: 'good' },
    { metric: 'Appropriate Referral', target: '> 95%', current: '97.1%', status: 'excellent' },
    { metric: 'User Satisfaction', target: '> 80%', current: '86.4%', status: 'excellent' },
    { metric: 'Adverse Events', target: '< 0.1%', current: '0.04%', status: 'excellent' },
  ];

  const getSeverityColor = (severity) => {
    const colors = {
      HIGH: '#ef4444',
      MEDIUM: '#f59e0b',
      LOW: '#84cc16',
    };
    return colors[severity] || '#666';
  };

  const getStatusColor = (status) => {
    const colors = {
      excellent: '#10b981',
      good: '#84cc16',
      warning: '#f59e0b',
      critical: '#ef4444',
    };
    return colors[status] || '#666';
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Risk & Safeguards</Text>
          <Text style={styles.heroSubtitle}>
            Multi-layered safety system ensuring appropriate care for every user
          </Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>97.1%</Text>
              <Text style={styles.statLabel}>Appropriate Referral Rate</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>0.04%</Text>
              <Text style={styles.statLabel}>Adverse Events</Text>
            </View>
          </View>
        </View>

        <View style={styles.contentSection}>
          {/* Core Principle */}
          <View style={styles.section}>
            <View style={styles.principleCard}>
              <Text style={styles.principleIcon}>🎯</Text>
              <Text style={styles.principleTitle}>Core Safety Principle</Text>
              <Text style={styles.principleText}>
                This system is designed to serve simple refractive errors safely while 
                identifying and referring complex cases to professional care. When in doubt, 
                we refer.
              </Text>
            </View>
          </View>

          {/* Risk Categories */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Risk Categories & Detection</Text>
            
            {riskCategories.map((risk) => (
              <TouchableOpacity
                key={risk.id}
                style={[styles.riskCard, { borderLeftColor: risk.color }]}
                onPress={() => setExpandedSection(expandedSection === risk.id ? null : risk.id)}
                activeOpacity={0.7}
              >
                <View style={styles.riskHeader}>
                  <View style={styles.riskTitleRow}>
                    <Text style={styles.riskIcon}>{risk.icon}</Text>
                    <Text style={styles.riskTitle}>{risk.title}</Text>
                  </View>
                  <View style={[styles.severityBadge, { backgroundColor: risk.color }]}>
                    <Text style={styles.severityText}>{risk.severity}</Text>
                  </View>
                </View>

                {expandedSection === risk.id && (
                  <View style={styles.riskDetails}>
                    <Text style={styles.detailsTitle}>Detection Criteria:</Text>
                    {risk.criteria.map((criterion, idx) => (
                      <View key={idx} style={styles.criterionItem}>
                        <Text style={styles.criterionDot}>•</Text>
                        <Text style={styles.criterionText}>{criterion}</Text>
                      </View>
                    ))}
                    
                    <View style={styles.actionBox}>
                      <Text style={styles.actionLabel}>Action:</Text>
                      <Text style={styles.actionText}>{risk.action}</Text>
                    </View>
                  </View>
                )}

                <Text style={styles.expandIcon}>
                  {expandedSection === risk.id ? '−' : '+'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Screening Protocol */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4-Layer Screening Protocol</Text>
            
            {screeningLayers.map((layer, idx) => (
              <View key={idx} style={styles.layerCard}>
                <View style={styles.layerHeader}>
                  <View style={styles.layerNumber}>
                    <Text style={styles.layerNumberText}>{idx + 1}</Text>
                  </View>
                  <Text style={styles.layerTitle}>{layer.layer}</Text>
                </View>

                <View style={styles.checksGrid}>
                  {layer.checks.map((check, i) => (
                    <View key={i} style={styles.checkItem}>
                      <Text style={styles.checkIcon}>✓</Text>
                      <Text style={styles.checkText}>{check}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.gatekeeperBox}>
                  <Text style={styles.gatekeeperLabel}>Gatekeeper:</Text>
                  <Text style={styles.gatekeeperText}>{layer.gatekeeper}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Safety Mechanisms */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Active Safety Mechanisms</Text>
            
            <View style={styles.mechanismsGrid}>
              {safetyMechanisms.map((mechanism, idx) => (
                <View key={idx} style={styles.mechanismCard}>
                  <Text style={styles.mechanismIcon}>{mechanism.icon}</Text>
                  <Text style={styles.mechanismTitle}>{mechanism.title}</Text>
                  <Text style={styles.mechanismDescription}>
                    {mechanism.description}
                  </Text>
                  <View style={styles.coverageBadge}>
                    <Text style={styles.coverageText}>{mechanism.coverage}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Exclusion Criteria */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Automatic Exclusion Criteria</Text>
            
            {exclusionCriteria.map((category, idx) => (
              <View key={idx} style={styles.exclusionCard}>
                <Text style={styles.exclusionCategory}>{category.category}</Text>
                <View style={styles.exclusionList}>
                  {category.items.map((item, i) => (
                    <View key={i} style={styles.exclusionItem}>
                      <Text style={styles.exclusionDot}>×</Text>
                      <Text style={styles.exclusionText}>{item}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}

            <View style={styles.exclusionNote}>
              <Text style={styles.exclusionNoteIcon}>ℹ️</Text>
              <Text style={styles.exclusionNoteText}>
                Users meeting any exclusion criteria are automatically directed to 
                seek professional eye care before using this system.
              </Text>
            </View>
          </View>

          {/* Success Metrics */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Performance & Safety Metrics</Text>
            
            <View style={styles.metricsCard}>
              {successMetrics.map((metric, idx) => (
                <View key={idx}>
                  {idx > 0 && <View style={styles.metricDivider} />}
                  <View style={styles.metricRow}>
                    <View style={styles.metricInfo}>
                      <Text style={styles.metricName}>{metric.metric}</Text>
                      <View style={styles.metricValues}>
                        <Text style={styles.metricTarget}>Target: {metric.target}</Text>
                        <Text style={styles.metricCurrent}>
                          Current: <Text style={[styles.metricCurrentValue, { color: getStatusColor(metric.status) }]}>
                            {metric.current}
                          </Text>
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(metric.status) }]}>
                      <Text style={styles.statusIcon}>✓</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Emergency Contact */}
          <View style={styles.section}>
            <View style={styles.emergencyCard}>
              <Text style={styles.emergencyIcon}>🚨</Text>
              <Text style={styles.emergencyTitle}>Emergency Eye Care</Text>
              <Text style={styles.emergencyText}>
                If you experience sudden vision loss, severe eye pain, flashes of light, 
                or other concerning symptoms:
              </Text>
              
              <TouchableOpacity style={styles.emergencyButton}>
                <Text style={styles.emergencyButtonText}>Contact Emergency Network</Text>
              </TouchableOpacity>

              <Text style={styles.emergencyNote}>
                Available 24/7 in partnership with regional eye care providers
              </Text>
            </View>
          </View>

          {/* Commitment */}
          <View style={styles.section}>
            <View style={styles.commitmentCard}>
              <Text style={styles.commitmentTitle}>Our Commitment</Text>
              <View style={styles.commitmentList}>
                {[
                  'Never compromise safety for accessibility',
                  'Continuous monitoring and improvement',
                  'Transparent reporting of outcomes',
                  'Partnership with professional eye care community',
                  'User protection as highest priority',
                ].map((item, i) => (
                  <View key={i} style={styles.commitmentItem}>
                    <Text style={styles.commitmentCheck}>✓</Text>
                    <Text style={styles.commitmentText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
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
  statsRow: {
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
    color: '#10b981',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
  },

  // Principle Card
  principleCard: {
    backgroundColor: '#e3f2fd',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  principleIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  principleTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
    textAlign: 'center',
  },
  principleText: {
    fontSize: 15,
    color: '#1976d2',
    lineHeight: 22,
    textAlign: 'center',
  },

  // Risk Cards
  riskCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    borderLeftWidth: 4,
  },
  riskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  riskTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riskIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  riskTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
    flex: 1,
  },
  severityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  severityText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  expandIcon: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    fontSize: 24,
    color: '#666',
  },
  riskDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  detailsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#000',
    marginBottom: 12,
  },
  criterionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  criterionDot: {
    fontSize: 16,
    color: '#666',
    marginRight: 8,
    marginTop: 2,
  },
  criterionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  actionBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    marginTop: 12,
  },
  actionLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginBottom: 4,
  },
  actionText: {
    fontSize: 14,
    color: '#000',
    lineHeight: 20,
  },

  // Layer Cards
  layerCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  layerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  layerNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  layerNumberText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  layerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    flex: 1,
  },
  checksGrid: {
    gap: 8,
    marginBottom: 16,
  },
  checkItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  checkIcon: {
    fontSize: 16,
    color: '#10b981',
    marginRight: 8,
    marginTop: 2,
  },
  checkText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  gatekeeperBox: {
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  gatekeeperLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#666',
    marginRight: 8,
  },
  gatekeeperText: {
    flex: 1,
    fontSize: 14,
    color: '#000',
    fontWeight: '600',
  },

  // Mechanisms Grid
  mechanismsGrid: {
    gap: 12,
  },
  mechanismCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  mechanismIcon: {
    fontSize: 32,
    marginBottom: 12,
  },
  mechanismTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#000',
    marginBottom: 8,
  },
  mechanismDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
    marginBottom: 12,
  },
  coverageBadge: {
    backgroundColor: '#f8f9fa',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  coverageText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#10b981',
  },

  // Exclusion Cards
  exclusionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  exclusionCategory: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000',
    marginBottom: 12,
  },
  exclusionList: {
    gap: 8,
  },
  exclusionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  exclusionDot: {
    fontSize: 18,
    color: '#ef4444',
    marginRight: 8,
    marginTop: 2,
  },
  exclusionText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  exclusionNote: {
    flexDirection: 'row',
    backgroundColor: '#fff3e0',
    padding: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  exclusionNoteIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  exclusionNoteText: {
    flex: 1,
    fontSize: 14,
    color: '#f57c00',
    lineHeight: 20,
  },

  // Metrics Card
  metricsCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  metricInfo: {
    flex: 1,
  },
  metricName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  metricValues: {
    gap: 4,
  },
  metricTarget: {
    fontSize: 13,
    color: '#666',
  },
  metricCurrent: {
    fontSize: 13,
    color: '#666',
  },
  metricCurrentValue: {
    fontWeight: '700',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusIcon: {
    fontSize: 16,
    color: '#fff',
  },
  metricDivider: {
    height: 1,
    backgroundColor: '#f0f0f0',
  },

  // Emergency Card
  emergencyCard: {
    backgroundColor: '#fee',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: '#ef4444',
    alignItems: 'center',
  },
  emergencyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emergencyTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#dc2626',
    marginBottom: 12,
    textAlign: 'center',
  },
  emergencyText: {
    fontSize: 15,
    color: '#991b1b',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  emergencyButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  emergencyButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  emergencyNote: {
    fontSize: 13,
    color: '#dc2626',
    textAlign: 'center',
  },

  // Commitment Card
  commitmentCard: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  commitmentTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000',
    marginBottom: 16,
    textAlign: 'center',
  },
  commitmentList: {
    gap: 12,
  },
  commitmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  commitmentCheck: {
    fontSize: 18,
    color: '#10b981',
    marginRight: 12,
    marginTop: 2,
  },
  commitmentText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
});