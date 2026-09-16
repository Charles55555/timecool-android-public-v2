import Foundation
import UserNotifications

/// Les rappels avant un rendez-vous.
///
/// Android programme des alarmes ; iOS des notifications locales. Le
/// résultat est le même : le téléphone se réveille seul à l'heure dite,
/// sans réseau et sans que l'application tourne.
///
/// Une différence à connaître : **iOS n'accepte que 64 notifications en
/// attente par application.** Au-delà, il garde les plus proches et jette
/// le reste, sans prévenir. La page en envoie sept jours d'avance, ce qui
/// reste en dessous pour un agenda ordinaire — mais on trie quand même
/// par date avant de poser, pour que ce soit toujours les prochaines qui
/// survivent et jamais les lointaines.
enum Rappels {

    /// Ce que la page envoie pour chaque rappel.
    struct Rappel: Decodable {
        let id: Int
        /// Millisecondes depuis 1970, comme le compte JavaScript.
        let quand: Double
        let titre: String
        let texte: String
    }

    /// Plafond d'iOS. Documenté par Apple, et silencieux : rien ne
    /// signale le dépassement, les notifications en trop disparaissent.
    private static let plafond = 60

    /// L'utilisateur a-t-il accordé les notifications ?
    static func autorisees(fini: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().getNotificationSettings { reglages in
            let oui = reglages.authorizationStatus == .authorized
                || reglages.authorizationStatus == .provisional
            DispatchQueue.main.async { fini(oui) }
        }
    }

    /// Demande l'autorisation. Le système ne l'affiche qu'une fois :
    /// refusée, elle ne se redemande que depuis les réglages du téléphone.
    static func demanderPermission(fini: @escaping (Bool) -> Void) {
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { accorde, _ in
            DispatchQueue.main.async { fini(accorde) }
        }
    }

    /// Remplace tous les rappels par ceux-ci.
    ///
    /// On efface avant de poser : la page envoie la liste complète à
    /// chaque changement d'agenda, et un rendez-vous supprimé doit cesser
    /// de sonner.
    static func programmer(
        json: String,
        silencieux: Bool,
        fini: @escaping (Int, String?) -> Void
    ) {
        guard let donnees = json.data(using: .utf8),
              let rappels = try? JSONDecoder().decode([Rappel].self, from: donnees)
        else {
            fini(0, "liste de rappels illisible")
            return
        }

        let centre = UNUserNotificationCenter.current()
        centre.removeAllPendingNotificationRequests()

        // Les plus proches d'abord : si le plafond d'iOS coupe, il coupe
        // dans les lointaines.
        let maintenant = Date().timeIntervalSince1970 * 1000
        let retenus = rappels
            .filter { $0.quand > maintenant }
            .sorted { $0.quand < $1.quand }
            .prefix(plafond)

        guard !retenus.isEmpty else {
            fini(0, nil)
            return
        }

        let groupe = DispatchGroup()
        var echecs = 0

        for rappel in retenus {
            let contenu = UNMutableNotificationContent()
            contenu.title = rappel.titre
            contenu.body = rappel.texte
            contenu.sound = silencieux ? nil : .default

            let quand = Date(timeIntervalSince1970: rappel.quand / 1000)
            let champs = Calendar.current.dateComponents(
                [.year, .month, .day, .hour, .minute], from: quand)

            let requete = UNNotificationRequest(
                identifier: "tc_\(rappel.id)",
                content: contenu,
                trigger: UNCalendarNotificationTrigger(
                    dateMatching: champs, repeats: false)
            )

            groupe.enter()
            centre.add(requete) { erreur in
                if erreur != nil { echecs += 1 }
                groupe.leave()
            }
        }

        groupe.notify(queue: .main) {
            let poses = retenus.count - echecs
            fini(poses, echecs > 0 ? "\(echecs) rappel(s) refusé(s)" : nil)
        }
    }

    /// Efface tout. Appelé quand l'utilisateur coupe le réglage.
    static func annuler() {
        UNUserNotificationCenter.current().removeAllPendingNotificationRequests()
    }
}
