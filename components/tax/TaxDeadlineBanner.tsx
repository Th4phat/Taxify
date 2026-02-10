import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Card, Text, Button, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { TaxDeadlineInfo } from '@/services/notifications/notification.service';

interface TaxDeadlineBannerProps {
  deadline: TaxDeadlineInfo;
  onFileNowPress?: () => void;
  onViewDetailsPress?: () => void;
  compact?: boolean;
}

export function TaxDeadlineBanner({
  deadline,
  onFileNowPress,
  onViewDetailsPress,
  compact = false,
}: TaxDeadlineBannerProps) {
  const theme = useTheme();
  
  const getStatusColor = () => {
    if (deadline.isOverdue) return theme.colors.error;
    if (deadline.daysUntilEDeadline <= 7) return theme.colors.error;
    if (deadline.daysUntilEDeadline <= 30) return theme.colors.warning || '#F59E0B';
    return theme.colors.primary;
  };
  
  const getStatusIcon = () => {
    if (deadline.isOverdue) return 'alert-circle';
    if (deadline.daysUntilEDeadline <= 7) return 'alarm';
    if (deadline.daysUntilEDeadline <= 30) return 'clock-alert';
    return 'calendar-check';
  };
  
  const getStatusText = () => {
    if (deadline.isOverdue) {
      return `Overdue by ${Math.abs(deadline.daysUntilEDeadline)} days`;
    }
    if (deadline.daysUntilEDeadline === 0) {
      return 'Due today!';
    }
    if (deadline.daysUntilEDeadline === 1) {
      return 'Due tomorrow!';
    }
    if (deadline.daysUntilEDeadline <= 7) {
      return `${deadline.daysUntilEDeadline} days left`;
    }
    return `${deadline.daysUntilEDeadline} days until deadline`;
  };
  
  const statusColor = getStatusColor();
  
  if (compact) {
    return (
      <Card 
        style={[styles.compactCard, { backgroundColor: statusColor + '15' }]}
        onPress={onViewDetailsPress}
      >
        <Card.Content style={styles.compactContent}>
          <MaterialCommunityIcons name={getStatusIcon()} size={20} color={statusColor} />
          <View style={styles.compactTextContainer}>
            <Text variant="bodyMedium" style={{ fontWeight: '600', color: statusColor }}>
              Tax Year {deadline.taxYear}
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              {getStatusText()}
            </Text>
          </View>
        </Card.Content>
      </Card>
    );
  }
  
  return (
    <Card style={[styles.card, { borderLeftColor: statusColor, borderLeftWidth: 4 }]}>
      <Card.Content>
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <MaterialCommunityIcons name={getStatusIcon()} size={32} color={statusColor} />
          </View>
          <View style={styles.headerContent}>
            <Text variant="titleMedium" style={{ fontWeight: 'bold', color: statusColor }}>
              Tax Filing {deadline.isOverdue ? 'Overdue' : 'Reminder'}
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.outline }}>
              Tax Year {deadline.taxYear}
            </Text>
          </View>
          <View style={[styles.daysBadge, { backgroundColor: statusColor + '20' }]}>
            <Text variant="titleLarge" style={{ fontWeight: 'bold', color: statusColor }}>
              {deadline.isOverdue ? '!' : deadline.daysUntilEDeadline}
            </Text>
            <Text variant="labelSmall" style={{ color: statusColor }}>
              {deadline.isOverdue ? 'OVERDUE' : 'DAYS'}
            </Text>
          </View>
        </View>
        
        <View style={styles.detailsContainer}>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="calendar" size={16} color={theme.colors.outline} />
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              Paper Filing: {deadline.paperFilingDeadline.toLocaleDateString('th-TH')}
            </Text>
          </View>
          <View style={styles.detailItem}>
            <MaterialCommunityIcons name="laptop" size={16} color={theme.colors.outline} />
            <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
              E-Filing: {deadline.eFilingDeadline.toLocaleDateString('th-TH')}
            </Text>
          </View>
        </View>
        
        {deadline.isOverdue && (
          <View style={[styles.warningBox, { backgroundColor: theme.colors.error + '15' }]}>
            <MaterialCommunityIcons name="alert" size={20} color={theme.colors.error} />
            <Text variant="bodySmall" style={{ color: theme.colors.error, flex: 1, marginLeft: 8 }}>
              Late filing may result in penalties and surcharges. File immediately to minimize fees.
            </Text>
          </View>
        )}
        
        <View style={styles.actions}>
          {onFileNowPress && (
            <Button
              mode="contained"
              onPress={onFileNowPress}
              style={{ flex: 1, marginRight: 8 }}
              buttonColor={statusColor}
            >
              {deadline.isOverdue ? 'File Immediately' : 'File Now'}
            </Button>
          )}
          {onViewDetailsPress && (
            <Button
              mode="outlined"
              onPress={onViewDetailsPress}
              style={{ flex: 1 }}
            >
              View Details
            </Button>
          )}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 16,
    marginVertical: 8,
    elevation: 2,
  },
  compactCard: {
    marginHorizontal: 16,
    marginVertical: 4,
    elevation: 1,
  },
  compactContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  compactTextContainer: {
    marginLeft: 12,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  daysBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  detailsContainer: {
    marginBottom: 16,
    gap: 8,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  warningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
});

export default TaxDeadlineBanner;
