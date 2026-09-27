/**
 * Clasa de bază pentru toate repository-urile.
 * Repository-urile sunt singurul strat care vorbește direct cu Firestore.
 */
export class BaseRepository {
  constructor(db) {
    this.db = db;
  }

  static toModel(snapshot) {
    return snapshot.exists() ? { id: snapshot.id, ...snapshot.data({ serverTimestamps: 'estimate' }) } : null;
  }

  static toList(querySnapshot) {
    return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: 'estimate' }) }));
  }

  static logError(label) {
    return (error) => console.error(`[${label}]`, error);
  }
}
