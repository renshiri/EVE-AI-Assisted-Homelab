import React, { useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  SafeAreaView, 
  ScrollView, 
  Pressable, 
  ActivityIndicator,
  useWindowDimensions 
} from 'react-native';
import { RefreshCw, TrendingUp, Coins, BarChart, AlertCircle } from 'lucide-react-native';
import { useEVE } from '../context/EVEContext';

export default function BazaarScene() {
  const { bazaarData = [], bazaarLastUpdated, refreshBazaar } = useEVE();
  const { width, height } = useWindowDimensions();

  // Dynamische Orientierungs- & Gerätetyp-Erkennung
  const isLandscape = width > height;
  const isTablet = width >= 768;

  const [refreshing, setRefreshing] = useState(false);

  const flipsList = Array.isArray(bazaarData) ? bazaarData : bazaarData?.flips || [];

  const formatCoins = (value) => {
    if (value === undefined || value === null) return '0';
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? '0' : num.toLocaleString('de-DE');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshBazaar();
    setRefreshing(false);
  };

  // Dynamische Spaltenberechnung je nach Gerät & Ausrichtung
  const getCardStyle = () => {
    if (width >= 1024 && isLandscape) return styles.card3Col; // 3 Spalten im großen Querformat
    if (isTablet || isLandscape) return styles.card2Col;      // 2 Spalten auf Tablet oder Smartphone-Querformat
    return styles.card1Col;                                   // 1 Spalte auf Smartphone-Hochformat
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* Header Bar */}
        <View style={[styles.headerCard, isLandscape && styles.headerCardLandscape]}>
          <View style={styles.cardGlowLine} />
          <View style={styles.headerLeft}>
            <View style={styles.statusDot} />
            <Text style={styles.headerTitle}>Live Bazaar Monitor</Text>
          </View>

          <Pressable onPress={handleRefresh} style={styles.refreshBtn}>
            <RefreshCw size={14} color="#22d3ee" />
            <Text style={styles.refreshText}>Stand: {bazaarLastUpdated || 'Live'}</Text>
          </Pressable>
        </View>

        {/* Live Grid / List */}
        <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          {flipsList.length === 0 ? (
            <View style={styles.emptyCard}>
              <View style={styles.cardGlowLine} />
              <AlertCircle size={28} color="#64748b" />
              <Text style={styles.emptyTitle}>Lade Live-Marktdaten vom Worker...</Text>
              <Text style={styles.emptySub}>Prüfe, ob der Service 'hypixel-worker' auf Port 5001 läuft.</Text>
              {refreshing && <ActivityIndicator size="small" color="#22d3ee" style={{ marginTop: 12 }} />}
            </View>
          ) : (
            <View style={styles.grid}>
              {flipsList.map((f, i) => {
                const itemName = f.item_name || f.itemName || f.item_id || f.itemId || 'Unbekanntes Item';
                const volume = f.volume || f.volume24h || 0;
                const marginPercent = f.margin_percent || f.marginPercent || f.margin_pct || 0;
                const buyPrice = f.buy_price ?? f.buyPrice ?? f.instant_buy ?? 0;
                const sellPrice = f.sell_price ?? f.sellPrice ?? f.instant_sell ?? 0;

                return (
                  <View key={f.item_id || f.itemId || i} style={[styles.flipCard, getCardStyle()]}>
                    <View style={styles.cardGlowLine} />
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={styles.itemTitleRow}>
                          <Coins size={15} color="#fbbf24" />
                          <Text style={styles.itemTitle} numberOfLines={1}>{itemName}</Text>
                        </View>
                        <View style={styles.volumeRow}>
                          <BarChart size={11} color="#64748b" />
                          <Text style={styles.volumeText}>Volumen: {formatCoins(volume)}</Text>
                        </View>
                      </View>

                      <View style={styles.marginBadge}>
                        <TrendingUp size={13} color="#34d399" />
                        <Text style={styles.marginText}>
                          +{typeof marginPercent === 'number' ? marginPercent.toFixed(1) : marginPercent}%
                        </Text>
                      </View>
                    </View>

                    <View style={styles.priceGrid}>
                      <View style={styles.priceCol}>
                        <Text style={styles.priceLabel}>BUY (INSTANT)</Text>
                        <Text style={[styles.priceVal, { color: '#22d3ee' }]}>{formatCoins(buyPrice)} Coins</Text>
                      </View>
                      <View style={styles.priceCol}>
                        <Text style={styles.priceLabel}>SELL (INSTANT)</Text>
                        <Text style={[styles.priceVal, { color: '#818cf8' }]}>{formatCoins(sellPrice)} Coins</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617',
  },
  container: {
    flex: 1,
    padding: 12,
  },
  headerCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    marginBottom: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  cardGlowLine: {
    position: 'absolute',
    top: 0,
    left: '35%',
    width: '30%',
    height: 1.5,
    backgroundColor: 'rgba(6, 182, 212, 0.5)',
  },
  headerCardLandscape: {
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#34d399',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: 'bold',
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  refreshText: {
    color: '#94a3b8',
    fontSize: 9,
  },
  scrollContainer: {
    paddingBottom: 110,
  },
  emptyCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 8,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 9,
    marginTop: 3,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card1Col: {
    width: '100%',
  },
  card2Col: {
    width: '48.8%',
  },
  card3Col: {
    width: '32.2%',
  },
  flipCard: {
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    borderWidth: 1,
    borderColor: '#1e293b',
    borderRadius: 20,
    padding: 12,
    justifyContent: 'space-between',
    position: 'relative',
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  itemTitle: {
    color: '#f8fafc',
    fontSize: 12,
    fontWeight: 'bold',
  },
  volumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 3,
  },
  volumeText: {
    color: '#64748b',
    fontSize: 9,
  },
  marginBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: 'rgba(52, 211, 153, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.3)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  marginText: {
    color: '#34d399',
    fontSize: 10,
    fontWeight: 'bold',
  },
  priceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    marginTop: 10,
    paddingTop: 8,
  },
  priceCol: {
    flex: 1,
  },
  priceLabel: {
    color: '#64748b',
    fontSize: 7.5,
    fontWeight: 'bold',
    marginBottom: 2,
  },
  priceVal: {
    fontSize: 11,
    fontWeight: 'bold',
  },
});