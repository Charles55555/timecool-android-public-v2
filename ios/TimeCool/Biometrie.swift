import Foundation
import LocalAuthentication
import Security

/// Face ID ou Touch ID, pour rouvrir TimeCool sans retaper son mot de passe.
///
/// Le principe est celui d'Android : le jeton de session est mis à l'abri,
/// et seul le visage — ou le doigt — de son propriétaire le ressort.
///
/// La mise en œuvre, elle, diffère. Android chiffre le jeton avec une clé
/// du magasin protégée par la biométrie. iOS fait plus simple et plus sûr :
/// le trousseau garde le jeton, et le système exige Face ID avant de le
/// rendre. Rien ne transite par notre code entre les deux.
///
/// `biometryCurrentSet` plutôt que `biometryAny` : si quelqu'un ajoute un
/// visage aux réglages du téléphone, le jeton devient illisible. Un
/// intrus qui enrôlerait le sien n'ouvrirait donc pas la session.
enum Biometrie {

    /// Nom sous lequel le trousseau range le jeton.
    private static let compte = "session"
    private static let service = "fr.timecool.app.biometrie"

    /// Le téléphone sait-il faire Face ID ou Touch ID, et est-ce configuré ?
    static func disponible() -> Bool {
        let contexte = LAContext()
        var erreur: NSError?
        return contexte.canEvaluatePolicy(
            .deviceOwnerAuthenticationWithBiometrics, error: &erreur)
    }

    /// Met le jeton à l'abri. Remplace celui qui s'y trouvait.
    ///
    /// - Returns: `nil` si tout s'est bien passé, sinon la raison.
    static func activer(jeton: String) -> String? {
        supprimer()

        guard let donnees = jeton.data(using: .utf8) else {
            return "jeton illisible"
        }

        var erreur: Unmanaged<CFError>?
        guard let controle = SecAccessControlCreateWithFlags(
            nil,
            // Le jeton ne quitte jamais cet appareil : ni sauvegarde
            // iCloud, ni restauration sur un autre téléphone.
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryCurrentSet,
            &erreur
        ) else {
            return "protection impossible"
        }

        let requete: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: compte,
            kSecValueData as String: donnees,
            kSecAttrAccessControl as String: controle
        ]

        let statut = SecItemAdd(requete as CFDictionary, nil)
        return statut == errSecSuccess ? nil : "trousseau : \(statut)"
    }

    /// Demande Face ID, puis rend le jeton.
    ///
    /// L'invite est affichée par le système : le mot de passe de
    /// l'utilisateur ne passe jamais par nous.
    static func deverrouiller(
        raison: String,
        fini: @escaping (String?) -> Void
    ) {
        // Le trousseau bloque le fil d'exécution le temps de l'invite :
        // on le laisse donc à l'écart de celui qui dessine l'écran.
        DispatchQueue.global(qos: .userInitiated).async {
            let contexte = LAContext()
            contexte.localizedReason = raison
            // Sans repli sur le code du téléphone : ici la biométrie est
            // un raccourci, pas une porte. Qui l'a perdue retape son mot
            // de passe, comme avant.
            contexte.localizedFallbackTitle = ""

            let requete: [String: Any] = [
                kSecClass as String: kSecClassGenericPassword,
                kSecAttrService as String: service,
                kSecAttrAccount as String: compte,
                kSecReturnData as String: true,
                kSecUseAuthenticationContext as String: contexte,
                kSecUseOperationPrompt as String: raison
            ]

            var sortie: CFTypeRef?
            let statut = SecItemCopyMatching(requete as CFDictionary, &sortie)

            let jeton: String?
            if statut == errSecSuccess,
               let donnees = sortie as? Data,
               let texte = String(data: donnees, encoding: .utf8) {
                jeton = texte
            } else {
                jeton = nil
            }

            DispatchQueue.main.async { fini(jeton) }
        }
    }

    /// Oublie le jeton. Appelé quand l'utilisateur coupe le réglage.
    @discardableResult
    static func supprimer() -> Bool {
        let requete: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: compte
        ]
        let statut = SecItemDelete(requete as CFDictionary)
        return statut == errSecSuccess || statut == errSecItemNotFound
    }
}
