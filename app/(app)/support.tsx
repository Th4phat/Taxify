import { View, StyleSheet, ScrollView, Linking } from 'react-native';
import { Text, useTheme, List, Divider, Button } from 'react-native-paper';
import { useTranslation } from '@/hooks/useTranslation';
import { useSettingsStore } from '@/stores/settingsStore';

export default function SupportScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const { language } = useSettingsStore();

  const isThai = language === 'th';

  const faqs = isThai ? [
    {
      q: 'ข้อมูลของฉันปลอดภัยหรือไม่?',
      a: 'ใช่ ข้อมูลทั้งหมดถูกเก็บบนอุปกรณ์ของคุณและถูกเข้ารหัส ไม่มีข้อมูลถูกส่งไปยังเซิร์ฟเวอร์ภายนอก',
    },
    {
      q: 'ฉันจะสำรองข้อมูลได้อย่างไร?',
      a: 'ไปที่ ตั้งค่า > ส่งออกข้อมูล เพื่อส่งออกธุรกรรมเป็นไฟล์ CSV หรือ HTML',
    },
    {
      q: 'ฉันจะตั้งค่า PIN หรือลายนิ้วมือได้อย่างไร?',
      a: 'ไปที่ ตั้งค่า > ความปลอดภัย > ล็อคแอพ เพื่อเปิดใช้งานการป้องกันด้วย PIN หรือลายนิ้วมือ',
    },
    {
      q: 'ฉันจะเพิ่มธุรกรรมประจำได้อย่างไร?',
      a: 'สร้างธุรกรรมใหม่แล้วเปิด "ตั้งเป็นรายการประจำ" หรือไปที่ ตั้งค่า > จัดการรายการประจำ',
    },
    {
      q: 'การคำนวณภาษีถูกต้องหรือไม่?',
      a: 'Taxify ใช้อัตราภาษีจากกรมสรรพากรไทย แต่คุณควรตรวจสอบก่อนยื่นภาษีจริง',
    },
  ] : [
    {
      q: 'Is my data secure?',
      a: 'Yes, all data is stored locally on your device and encrypted. No data is sent to external servers.',
    },
    {
      q: 'How do I backup my data?',
      a: 'Go to Settings > Export Data to export your transactions as CSV or HTML files.',
    },
    {
      q: 'How do I set up PIN or fingerprint?',
      a: 'Go to Settings > Security > App Lock to enable PIN or biometric protection.',
    },
    {
      q: 'How do I add recurring transactions?',
      a: 'Create a new transaction and toggle "Make Recurring", or go to Settings > Manage Recurring.',
    },
    {
      q: 'Are the tax calculations accurate?',
      a: 'Taxify uses Thai Revenue Department tax rates, but you should verify before actual filing.',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
          {isThai ? 'ช่วยเหลือและสนับสนุน' : 'Help & Support'}
        </Text>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          {isThai ? 'ติดต่อเรา' : 'Contact Us'}
        </Text>
        
        <List.Section style={[styles.section, { backgroundColor: theme.colors.surface }]}>
          <List.Item
            title={isThai ? 'อีเมล' : 'Email'}
            description="support@taxify.app"
            left={(props) => <List.Icon {...props} icon="email" />}
            onPress={() => Linking.openURL('mailto:support@taxify.app')}
          />
          <Divider />
          <List.Item
            title={isThai ? 'เว็บไซต์' : 'Website'}
            description="www.taxify.app"
            left={(props) => <List.Icon {...props} icon="web" />}
            onPress={() => Linking.openURL('https://taxify.app')}
          />
        </List.Section>

        <Text variant="titleSmall" style={[styles.sectionTitle, { color: theme.colors.primary }]}>
          {isThai ? 'คำถามที่พบบ่อย' : 'Frequently Asked Questions'}
        </Text>

        {faqs.map((faq, index) => (
          <View 
            key={index} 
            style={[
              styles.faqItem, 
              { backgroundColor: theme.colors.surface }
            ]}
          >
            <Text variant="titleSmall" style={[styles.question, { color: theme.colors.onSurface }]}>
              {faq.q}
            </Text>
            <Text variant="bodyMedium" style={[styles.answer, { color: theme.colors.onSurfaceVariant }]}>
              {faq.a}
            </Text>
          </View>
        ))}

        <View style={styles.appInfo}>
          <Text variant="bodySmall" style={{ color: theme.colors.outline }}>
            Taxify v1.0.0
          </Text>
          <Text variant="bodySmall" style={{ color: theme.colors.outline, marginTop: 4 }}>
            {isThai ? '© 2026 Taxify. สงวนลิขสิทธิ์' : '© 2026 Taxify. All rights reserved.'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 16,
  },
  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,
    fontWeight: '600',
  },
  section: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  faqItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  question: {
    fontWeight: '600',
    marginBottom: 8,
  },
  answer: {
    lineHeight: 20,
  },
  appInfo: {
    marginTop: 24,
    marginBottom: 32,
    alignItems: 'center',
  },
});
