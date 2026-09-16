import UIKit
import UserNotifications

/// Le point d'entrée de l'application.
///
/// Un seul écran : la page TimeCool. Pas de navigation native, pas de
/// menus — tout se passe dans la page, comme sur Android.
@main
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions options: [UIApplication.LaunchOptionsKey: Any]?
    ) -> Bool {
        // Sans ce délégué, un rappel qui arrive pendant que TimeCool est
        // ouvert ne s'affiche pas : iOS considère que l'application est
        // déjà là pour prévenir. Or ici, elle ne prévient de rien.
        UNUserNotificationCenter.current().delegate = self

        let fenetre = UIWindow(frame: UIScreen.main.bounds)
        fenetre.rootViewController = VueWeb()
        fenetre.makeKeyAndVisible()
        window = fenetre
        return true
    }
}

extension AppDelegate: UNUserNotificationCenterDelegate {

    /// Affiche le rappel même quand l'application est au premier plan.
    func userNotificationCenter(
        _ centre: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler fini: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        if #available(iOS 14.0, *) {
            fini([.banner, .sound, .list])
        } else {
            fini([.alert, .sound])
        }
    }
}
