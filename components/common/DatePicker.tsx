import { useState } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Button, Portal, Modal, useTheme, IconButton } from 'react-native-paper';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

import type { AppTheme } from '@/types/theme';
import { useTranslation } from '@/hooks/useTranslation';

interface DatePickerProps {
  date: Date;
  onDateChange: (date: Date) => void;
  label?: string;
  minimumDate?: Date;
  maximumDate?: Date;
  formatDate?: (date: Date) => string;
}

function defaultFormatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function DatePicker({
  date,
  onDateChange,
  label,
  minimumDate,
  maximumDate,
  formatDate = defaultFormatDate,
}: DatePickerProps) {
  const theme = useTheme<AppTheme>();
  const { t } = useTranslation();
  
  const actualLabel = label ?? t('datePicker.selectDate');
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(date);

  const handleChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
      if (selectedDate) {
        onDateChange(selectedDate);
      }
    } else {
      if (selectedDate) {
        setTempDate(selectedDate);
      }
    }
  };

  const openPicker = () => {
    setTempDate(date);
    setShowPicker(true);
  };

  const confirmDate = () => {
    onDateChange(tempDate);
    setShowPicker(false);
  };

  const cancelDate = () => {
    setTempDate(date);
    setShowPicker(false);
  };

  if (Platform.OS === 'android') {
    return (
      <>
        <Button
          mode="outlined"
          icon="calendar"
          onPress={openPicker}
          style={styles.button}
          contentStyle={styles.buttonContent}
        >
          {formatDate(date)}
        </Button>
        {showPicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={handleChange}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
          />
        )}
      </>
    );
  }

  return (
    <>
      <Button
        mode="outlined"
        icon="calendar"
        onPress={openPicker}
        style={styles.button}
        contentStyle={styles.buttonContent}
      >
        {formatDate(date)}
      </Button>

      <Portal>
        <Modal
          visible={showPicker}
          onDismiss={cancelDate}
          contentContainerStyle={[styles.modalContainer, { backgroundColor: theme.colors.surface }]}
        >
          <View style={styles.modalHeader}>
            <IconButton icon="close" size={24} onPress={cancelDate} />
            <Button mode="contained" onPress={confirmDate} compact>
              {t('datePicker.done')}
            </Button>
          </View>
          <View style={styles.pickerContainer}>
            <DateTimePicker
              value={tempDate}
              mode="date"
              display="spinner"
              onChange={handleChange}
              minimumDate={minimumDate}
              maximumDate={maximumDate}
              style={styles.picker}
            />
          </View>
        </Modal>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    justifyContent: 'flex-start',
  },
  buttonContent: {
    justifyContent: 'flex-start',
    paddingHorizontal: 12,
  },
  modalContainer: {
    margin: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  pickerContainer: {
    alignItems: 'center',
    paddingBottom: 16,
  },
  picker: {
    width: 320,
  },
});

export default DatePicker;
