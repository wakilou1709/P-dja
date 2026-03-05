import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { examsApi } from '../../../lib/api';
import { Skeleton } from '../../../components/Skeleton';
import { NeoCard } from '../../../components/NeoCard';
import { colors, radius, neoInset } from '../../../lib/theme';

interface Exam { id: string; title: string; subject: string; examType: string; year: number; difficulty: string; series?: string }

const EXAM_TYPES = ['Tous', 'BAC', 'BEPC', 'CEP', 'CONCOURS_FP', 'Licence', 'Master'];
const TYPE_LABEL: Record<string, string> = { CONCOURS_FP: 'Concours' };
const DIFF_COLOR: Record<string, string> = { EASY: '#10B981', MEDIUM: '#F59E0B', HARD: '#EF4444', EXPERT: '#9333ea' };
const DIFF_LABEL: Record<string, string> = { EASY: 'Facile', MEDIUM: 'Moyen', HARD: 'Difficile', EXPERT: 'Expert' };
const PAGE_SIZE = 20;

export default function ExamsScreen() {
  const router = useRouter();
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [activeType, setActiveType] = useState('Tous');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const fetchExams = useCallback(async (opts: { reset?: boolean; type?: string; q?: string } = {}) => {
    const currentPage = opts.reset ? 1 : page;
    const params: Record<string, unknown> = { limit: PAGE_SIZE, page: currentPage };
    const type = opts.type !== undefined ? opts.type : activeType;
    if (type !== 'Tous') params.examType = type;
    const q = opts.q !== undefined ? opts.q : search;
    if (q.trim()) params.search = q.trim();

    try {
      const data = await examsApi.getAll(params);
      const items: Exam[] = data.data ?? data ?? [];
      if (opts.reset) { setExams(items); setPage(2); }
      else { setExams(prev => [...prev, ...items]); setPage(p => p + 1); }
      setHasMore(items.length === PAGE_SIZE);
    } catch { Alert.alert('Erreur', 'Impossible de charger les examens'); }
    finally { setIsLoading(false); setIsRefreshing(false); setIsLoadingMore(false); }
  }, [activeType, search, page]);

  useEffect(() => { setIsLoading(true); fetchExams({ reset: true }); }, []);

  const onTypeChange = (type: string) => { setActiveType(type); setIsLoading(true); fetchExams({ reset: true, type }); };
  const onSearch = (text: string) => { setSearch(text); if (text.length === 0 || text.length >= 3) { setIsLoading(true); fetchExams({ reset: true, q: text }); } };
  const onLoadMore = () => { if (!isLoadingMore && hasMore) { setIsLoadingMore(true); fetchExams(); } };

  const renderExam = ({ item }: { item: Exam }) => (
    <TouchableOpacity onPress={() => router.push(`/(tabs)/exams/${item.id}` as any)}>
      <NeoCard size="sm" style={styles.examCard}>
        <View style={styles.examTop}>
          <Text style={styles.examTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.diffBadge, { backgroundColor: DIFF_COLOR[item.difficulty] + '18', borderColor: DIFF_COLOR[item.difficulty] + '40' }]}>
            <Text style={[styles.diffText, { color: DIFF_COLOR[item.difficulty] }]}>{DIFF_LABEL[item.difficulty] ?? item.difficulty}</Text>
          </View>
        </View>
        <View style={styles.examMeta}>
          <View style={styles.typeBadge}><Text style={styles.typeText}>{TYPE_LABEL[item.examType] ?? item.examType}</Text></View>
          <Text style={styles.metaText}>{item.subject}</Text>
          {item.series ? <Text style={styles.metaText}>Série {item.series}</Text> : null}
          <Text style={styles.metaText}>{item.year}</Text>
        </View>
      </NeoCard>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Examens</Text>
        <TextInput
          style={styles.search}
          placeholder="Rechercher..."
          placeholderTextColor={colors.textLight}
          value={search}
          onChangeText={onSearch}
          returnKeyType="search"
        />
      </View>

      <FlatList
        data={EXAM_TYPES}
        keyExtractor={t => t}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filters}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.filterChip, activeType === item && styles.filterChipActive]}
            onPress={() => onTypeChange(item)}
          >
            <Text style={[styles.filterText, activeType === item && styles.filterTextActive]}>
              {TYPE_LABEL[item] ?? item}
            </Text>
          </TouchableOpacity>
        )}
      />

      {isLoading ? (
        <View style={styles.skeletonList}>
          {[1, 2, 3, 4].map(i => <Skeleton key={i} height={100} borderRadius={16} style={{ marginBottom: 12 }} />)}
        </View>
      ) : (
        <FlatList
          data={exams}
          keyExtractor={item => item.id}
          renderItem={renderExam}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={() => { setIsRefreshing(true); fetchExams({ reset: true }); }} tintColor={colors.primary} />}
          onEndReached={onLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <NeoCard style={styles.emptyCard}>
              <Text style={styles.emptyText}>Aucun examen trouvé</Text>
            </NeoCard>
          }
          ListFooterComponent={isLoadingMore ? <ActivityIndicator color={colors.primary} style={{ paddingVertical: 16 }} /> : null}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { padding: 20, paddingTop: 56 },
  title: { fontSize: 26, fontWeight: '800', color: colors.text, marginBottom: 14 },
  search: { ...neoInset, borderRadius: radius.md, paddingVertical: 12, paddingHorizontal: 16, color: colors.text, fontSize: 15 },
  filters: { paddingHorizontal: 20, paddingBottom: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: radius.full,
    backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.shadowDark,
    shadowColor: colors.shadowDark, shadowOffset: { width: 2, height: 2 }, shadowOpacity: 0.6, shadowRadius: 4, elevation: 2,
  },
  filterChipActive: { backgroundColor: colors.primary, borderColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.4 },
  filterText: { color: colors.textMuted, fontSize: 13, fontWeight: '600' },
  filterTextActive: { color: colors.white },
  skeletonList: { padding: 20 },
  listContent: { padding: 20, paddingTop: 8 },
  examCard: { marginBottom: 12 },
  examTop: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  examTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, marginRight: 8, lineHeight: 20 },
  diffBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full, borderWidth: 1, flexShrink: 0 },
  diffText: { fontSize: 11, fontWeight: '700' },
  examMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  typeBadge: { backgroundColor: colors.surfaceDeep, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  typeText: { color: colors.textMuted, fontSize: 11, fontWeight: '600' },
  metaText: { color: colors.textLight, fontSize: 12 },
  emptyCard: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { color: colors.textLight, fontSize: 15 },
});
