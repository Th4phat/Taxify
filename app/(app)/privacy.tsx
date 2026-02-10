import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, useTheme } from 'react-native-paper';
import { useSettingsStore } from '@/stores/settingsStore';

export default function PrivacyPolicyScreen() {
  const theme = useTheme();
  const { language } = useSettingsStore();

  const isThai = language === 'th';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={[styles.title, { color: theme.colors.primary }]}>
          {isThai ? 'นโยบายความเป็นส่วนตัว' : 'Privacy Policy'}
        </Text>
        
        <Text variant="bodySmall" style={[styles.date, { color: theme.colors.outline }]}>
          {isThai ? 'อัปเดตล่าสุด: 6 กุมภาพันธ์ 2026' : 'Last Updated: February 6, 2026'}
        </Text>

        <Section title={isThai ? '1. บทนำ' : '1. Introduction'}>
          {isThai 
            ? 'Taxify ให้ความสำคัญกับความเป็นส่วนตัวของคุณ แอปพลิเคชันนี้ถูกออกแบบมาเพื่อเก็บข้อมูลทั้งหมดบนอุปกรณ์ของคุณ โดยไม่มีการส่งข้อมูลไปยังเซิร์ฟเวอร์ภายนอก'
            : 'Taxify values your privacy. This application is designed to store all data locally on your device without sending any information to external servers.'}
        </Section>

        <Section title={isThai ? '2. ข้อมูลที่เราเก็บ' : '2. Information We Collect'}>
          {isThai
            ? 'เราเก็บข้อมูลต่อไปนี้บนอุปกรณ์ของคุณเท่านั้น:\n• ข้อมูลธุรกรรมรายรับและรายจ่าย\n• หมวดหมู่ที่คุณสร้าง\n• การตั้งค่าแอปพลิเคชัน\n• รูปภาพใบเสร็จ (ถ้ามี)\n• ข้อมูล PIN และการตั้งค่าความปลอดภัย (เข้ารหัสไว้)'
            : 'We only store the following information on your device:\n• Income and expense transaction data\n• Categories you create\n• Application settings\n• Receipt images (if any)\n• PIN and security settings (encrypted)'}
        </Section>

        <Section title={isThai ? '3. ข้อมูลที่ไม่เก็บ' : '3. Information We Do Not Collect'}>
          {isThai
            ? 'เราไม่เก็บหรือส่งข้อมูลต่อไปนี้:\n• ข้อมูลส่วนตัวที่สามารถระบุตัวตนได้\n• ข้อมูลการใช้งานหรือ analytics\n• ข้อมูลตำแหน่งที่ตั้ง\n• ข้อมูลบัญชีธนาคารหรือบัตรเครดิต'
            : 'We do not collect or transmit:\n• Personally identifiable information\n• Usage data or analytics\n• Location data\n• Bank account or credit card information'}
        </Section>

        <Section title={isThai ? '4. ความปลอดภัยของข้อมูล' : '4. Data Security'}>
          {isThai
            ? 'ข้อมูลของคุณถูกเก็บอย่างปลอดภัย:\n• ฐานข้อมูล SQLite ถูกเข้ารหัสด้วย SQLCipher\n• PIN ถูกเก็บใน iOS Keychain / Android Keystore\n• ไม่มีการส่งข้อมูลผ่านอินเทอร์เน็ต'
            : 'Your data is stored securely:\n• SQLite database is encrypted with SQLCipher\n• PIN is stored in iOS Keychain / Android Keystore\n• No data is transmitted over the internet'}
        </Section>

        <Section title={isThai ? '5. การส่งออกข้อมูล' : '5. Data Export'}>
          {isThai
            ? 'คุณสามารถส่งออกข้อมูลของคุณได้ตลอดเวลาในรูปแบบ CSV หรือ HTML ข้อมูลเหล่านี้จะถูกบันทึกลงในอุปกรณ์ของคุณและอยู่ภายใต้การควบคุมของคุณ'
            : 'You can export your data at any time in CSV or HTML format. This data will be saved to your device and remains under your control.'}
        </Section>

        <Section title={isThai ? '6. การลบข้อมูล' : '6. Data Deletion'}>
          {isThai
            ? 'คุณสามารถลบข้อมูลทั้งหมดได้ตลอดเวลาผ่านเมนูตั้งค่า การลบแอปจะลบข้อมูลทั้งหมดบนอุปกรณ์ของคุณ'
            : 'You can delete all data at any time through the settings menu. Uninstalling the app will remove all data from your device.'}
        </Section>

        <Section title={isThai ? '7. การติดต่อ' : '7. Contact Us'}>
          {isThai
            ? 'หากคุณมีคำถามเกี่ยวกับนโยบายความเป็นส่วนตัว กรุณาติดต่อเราผ่านหน้าช่วยเหลือและสนับสนุน'
            : 'If you have any questions about this Privacy Policy, please contact us through the Help & Support page.'}
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
