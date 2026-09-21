import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  Pressable, 
  Modal, 
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  useWindowDimensions
} from 'react-native';
import { ShieldCheck, User, Lock, AlertCircle } from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

export default function LoginModal({ visible }) {
  const { login } = useEVE();
  const { width, height } = useWindowDimensions();

  // Dynamische Orientierungs- & Gerätetyp-Erkennung
  const isLandscape = width > height;

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!username.trim() || !password.trim()) {
      setErrorMsg('Bitte Benutzername und Passwort eingeben.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      // Robust gegen synchrone oder asynchrone Login-Funktionen im Context
      const result = await Promise.resolve(login(username, password));

      if (result && !result.success) {
        setErrorMsg(result.message || 'Zugriff verweigert: Ungültige Daten');
      }
    } catch (err) {
      console.error('[Auth Error]', err);
      setErrorMsg('Verbindungsfehler zum Server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.overlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.keyboardView}
          >
            <View style={[styles.modalCard, isLandscape && styles.modalCardLandscape]}>
              
              {/* Einheitliche Cyan Top Glow Line */}
              <View style={styles.cardGlowLine} />

              {/* Shield Icon Container */}
              <View style={[styles.iconContainer, isLandscape && styles.iconContainerLandscape]}>
                <ShieldCheck size={isLandscape ? 26 : 32} color="#22d3ee" />
              </View>

              <Text style={styles.title}>EVE System Access</Text>
              <Text style={[styles.subtitle, isLandscape && styles.subtitleLandscape]}>Linux Account Authentifizierung</Text>

              {/* Formular */}
              <View style={[styles.form, isLandscape && styles.formLandscape]}>
                
                {/* Username Input */}
                <View style={[styles.inputWrapper, isLandscape && styles.inputWrapperLandscape]}>
                  <User size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Linux Benutzername"
                    placeholderTextColor="#64748b"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>

                {/* Password Input */}
                <View style={[styles.inputWrapper, isLandscape && styles.inputWrapperLandscape]}>
                  <Lock size={16} color="#64748b" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Passwort"
                    placeholderTextColor="#64748b"
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                  />
                </View>

                {/* Error Message */}
                {!!errorMsg && (
                  <View style={styles.errorBox}>
                    <AlertCircle size={14} color="#f43f5e" />
                    <Text style={styles.errorText}>{errorMsg}</Text>
                  </View>
                )}

                {/* Submit Button */}
                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  style={({ pressed }) => [
                    styles.submitBtn,
                    isLandscape && styles.submitBtnLandscape,
                    pressed && { opacity: 0.8 },
                    loading && { opacity: 0.6 }
                  ]}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Anmelden</Text>
                  )}
                </Pressable>

              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  keyboardView: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  modalCard: {
    width: '100%',
    backgroundColor: 'rgba(15, 23, 42, 0.96)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#06b6d4',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalCardLandscape: {
    padding: 14,
    maxWidth: 440,
  },
  cardGlowLine: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: '30%',
    height: 1.5,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(6, 182, 212, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(6, 182, 212, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    marginTop: 6,
  },
  iconContainerLandscape: {
    width: 40,
    height: 40,
    marginBottom: 6,
    marginTop: 2,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#f8fafc',
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 10,
    color: '#64748b',
    marginTop: 2,
    marginBottom: 16,
  },
  subtitleLandscape: {
    marginBottom: 8,
  },
  form: {
    width: '100%',
    gap: 10,
  },
  formLandscape: {
    gap: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 44,
  },
  inputWrapperLandscape: {
    height: 36,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#f1f5f9',
    fontSize: 12,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 10,
    padding: 8,
  },
  errorText: {
    color: '#f43f5e',
    fontSize: 10,
    flex: 1,
  },
  submitBtn: {
    backgroundColor: '#06b6d4',
    borderRadius: 14,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  submitBtnLandscape: {
    height: 36,
  },
  submitBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 13,
  },
});