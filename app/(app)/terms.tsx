import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSettingsStore } from '@/stores/settingsStore';

export default function TermsOfServiceScreen() {
  const theme = useTheme();
  const { language } = useSettingsStore();

  const isThai = language === 'th';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
          {isThai ? 'เงื่อนไขการให้บริการ' : 'Terms of Service'}
        </Text>
        
        <Text variant="bodySmall" style={[styles.date, { color: theme.colors.outline }]}>
          {isThai ? 'อัปเดตล่าสุด: 6 กุมภาพันธ์ 2026' : 'Last Updated: February 6, 2026'}
        </Text>

        <Section title={isThai ? '1. การยอมรับเงื่อนไข' : '1. Acceptance of Terms'}>
          {isThai 
            ? 'การใช้ Taxify แสดงว่าคุณยอมรับเงื่อนไขการให้บริการเหล่านี้ หากคุณไม่เห็นด้วย กรุณาหยุดใช้แอปพลิเคชัน'
            : 'By using Taxify, you agree to these Terms of Service. If you do not agree, please discontinue use of the application.'}
        </Section>

        <Section title={isThai ? '2. คำจำกัดความ' : '2. Disclaimer'}>
          {isThai
            ? 'Taxify เป็นเครื่องมือช่วยคำนวณภาษีเท่านั้น เราไม่รับประกันความถูกต้องของการคำนวณภาษี คุณควรตรวจสอบกับสรรพากรหรือที่ปรึกษาทางการเงินก่อนยื่นภาษี'
            : 'Taxify is a tax calculation tool only. We do not guarantee the accuracy of tax calculations. You should verify with the Revenue Department or a financial advisor before filing taxes.'}
        </Section>

        <Section title={isThai ? '3. การใช้งาน' : '3. Use of Service'}>
          {isThai
            ? 'คุณตกลงที่จะ:\n• ใช้แอปพลิเคชันตามกฎหมายที่บังคับใช้\n• ไม่พยายามเข้าถึงฐานข้อมูลหรือระบบโดยไม่ได้รับอนุญาต\n• ไม่แก้ไข ถอดรหัส หรือย้อนกลับแอปพลิเคชัน'
            : 'You agree to:\n• Use the application in compliance with applicable laws\n• Not attempt to access databases or systems without authorization\n• Not modify, decompile, or reverse engineer the application'}
        </Section>

        <Section title={isThai ? '4. การสำรองข้อมูล' : '4. Data Backup'}>
          {isThai
            ? 'คุณรับผิดชอบในการสำรองข้อมูลของคุณเอง เราไม่รับผิดชอบต่อการสูญหายของข้อมูลอันเนื่องมาจากการสูญหายหรือเสียหายของอุปกรณ์'
            : 'You are responsible for backing up your own data. We are not liable for data loss due to device loss or damage.'}
        </Section>

        <Section title={isThai ? '5. การเปลี่ยนแปลงเงื่อนไข' : '5. Changes to Terms'}>
          {isThai
            ? 'เราอาจปรับปรุงเงื่อนไขการให้บริการเป็นครั้งคราว การใช้งานต่อเนื่องหลังจากการเปลี่ยนแปลงแสดงว่าคุณยอมรับเงื่อนไขใหม่'
            : 'We may update these Terms of Service from time to time. Continued use after changes indicates acceptance of the new terms.'}
        </Section>

        <Section title={isThai ? '6. การห้ามใช้งาน' : '6. Termination'}>
          {isThai
            ? 'คุณสามารถหยุดใช้ Taxify ได้ตลอดเวลาโดยการถอนการติดตั้งแอปพลิเคชัน ข้อมูลทั้งหมดจะถูกลบจากอุปกรณ์ของคุณ'
            : 'You may stop using Taxify at any time by uninstalling the application. All data will be removed from your device.'}
        </Section>

        <Section title={isThai ? '7. กฎหมายที่บังคับใช้' : '7. Governing Law'}>
          {isThai
            ? 'เงื่อนไขการให้บริการนี้อยู่ภายใต้กฎหมายไทย'
            : 'These Terms of Service are governed by the laws of Thailand.'}
        </Section>
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: string }) {
  const theme = useTheme();
  
  return (
    <View style={styles.section}>
      <Text variant="titleMedium" style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={[styles.text, { color: theme.colors.onSurfaceVariant }]}>
        {children}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
  },
  title: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  date: {
    marginBottom: 24,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  text: {
    lineHeight: 22,
  },
});
