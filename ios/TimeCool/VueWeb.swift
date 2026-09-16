import UIKit
import WebKit

/// L'écran unique de TimeCool : la page web, et le pont vers l'iPhone.
///
/// Même principe que l'application Android — une page embarquée dans
/// l'application, pas un site distant. Elle fonctionne donc hors ligne,
/// et Apple ne la prend pas pour un simple navigateur déguisé.
final class VueWeb: UIViewController {

    private var vue: WKWebView!

    // MARK: - Mise en place

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .white

        let reglages = WKWebViewConfiguration()
        reglages.allowsInlineMediaPlayback = true

        let controleur = WKUserContentController()
        controleur.add(self, name: "timecool")
        reglages.userContentController = controleur

        vue = WKWebView(frame: .zero, configuration: reglages)
        vue.navigationDelegate = self
        vue.uiDelegate = self
        // La page gère elle-même ses zones sûres : sans cela, iOS ajoute
        // ses propres marges et le contenu saute au premier défilement.
        vue.scrollView.contentInsetAdjustmentBehavior = .never
        vue.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(vue)
        NSLayoutConstraint.activate([
            vue.topAnchor.constraint(equalTo: view.topAnchor),
            vue.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            vue.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            vue.trailingAnchor.constraint(equalTo: view.trailingAnchor)
        ])

        poserLePont(sur: controleur)
        chargerLaPage()

        // L'autorisation des notifications peut être retirée depuis les
        // réglages du téléphone pendant que l'application dort : on la
        // relit à chaque retour au premier plan.
        NotificationCenter.default.addObserver(
            self, selector: #selector(relireAutorisations),
            name: UIApplication.didBecomeActiveNotification, object: nil)
    }

    /// Dépose l'objet TimeCoolNatif dans la page, avant son premier script.
    private func poserLePont(sur controleur: WKUserContentController) {
        guard let chemin = Bundle.main.path(forResource: "pont", ofType: "js"),
              let pont = try? String(contentsOfFile: chemin, encoding: .utf8)
        else {
            assertionFailure("pont.js absent du paquet")
            return
        }

        let version = Bundle.main
            .object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? ""
        let build = Bundle.main
            .object(forInfoDictionaryKey: "CFBundleVersion") as? String ?? ""

        // Les réponses que la page attend immédiatement, déposées avant
        // le pont : elles ne peuvent pas être demandées après coup, un
        // message vers l'application ne rend jamais de valeur.
        let etat = """
        window.__tcEtatNatif = {
          version: "\(version)",
          buildTime: "\(build)",
          biometrie: \(Biometrie.disponible()),
          notifications: false
        };
        """

        controleur.addUserScript(WKUserScript(
            source: etat + "\n" + pont,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true))
    }

    private func chargerLaPage() {
        guard let url = Bundle.main.url(
            forResource: "index", withExtension: "html", subdirectory: "web")
        else {
            assertionFailure("index.html absent du paquet")
            return
        }
        vue.loadFileURL(url, allowingReadAccessTo: url.deletingLastPathComponent())
    }

    // MARK: - Vers la page

    /// Appelle une fonction JavaScript, en lui passant une chaîne.
    private func appelerJs(_ fonction: String, _ argument: String = "") {
        let encode = String(
            data: (try? JSONEncoder().encode(argument)) ?? Data(),
            encoding: .utf8) ?? "\"\""
        let script = argument.isEmpty ? "\(fonction)()" : "\(fonction)(\(encode))"
        DispatchQueue.main.async { self.vue.evaluateJavaScript(script) }
    }

    @objc private func relireAutorisations() {
        Rappels.autorisees { [weak self] oui in
            self?.vue.evaluateJavaScript("tcNatifMaj({ notifications: \(oui) })")
        }
    }
}

// MARK: - Depuis la page

extension VueWeb: WKScriptMessageHandler {

    func userContentController(
        _ controleur: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let corps = message.body as? [String: Any],
              let action = corps["action"] as? String
        else { return }

        switch action {

        case "demanderPermissionNotifications":
            Rappels.demanderPermission { [weak self] accorde in
                self?.vue.evaluateJavaScript(
                    "tcNatifMaj({ notifications: \(accorde) })")
                self?.appelerJs("tcNotificationsReponse", accorde ? "true" : "false")
            }

        case "programmerRappels":
            let json = corps["rappels"] as? String ?? "[]"
            let silencieux = corps["silencieux"] as? Bool ?? false
            Rappels.programmer(json: json, silencieux: silencieux) { [weak self] poses, erreur in
                if let erreur = erreur {
                    self?.appelerJs("tcRappelsEchec", erreur)
                } else {
                    self?.appelerJs("tcRappelsProgrammes", String(poses))
                }
            }

        case "annulerRappels":
            Rappels.annuler()

        case "activerBiometrie":
            let jeton = corps["jeton"] as? String ?? ""
            let erreur = Biometrie.activer(jeton: jeton)
            appelerJs("tcBiometrieActivation", erreur == nil ? "true" : "false")

        case "deverrouillerBiometrie":
            Biometrie.deverrouiller(
                raison: "Déverrouiller TimeCool"
            ) { [weak self] jeton in
                if let jeton = jeton {
                    self?.appelerJs("tcBiometrieDeverrouille", jeton)
                } else {
                    self?.appelerJs("tcBiometrieEchec")
                }
            }

        case "desactiverBiometrie":
            Biometrie.supprimer()

        case "contactsPasEncore":
            // Dit franchement ce qu'il en est, plutôt que de laisser la
            // page annoncer qu'il faut « l'application Android » — faux,
            // puisqu'on est dans l'application iPhone.
            appelerJs("tcContactsErreur",
                      "l'import du carnet d'adresses n'existe pas encore sur iPhone")

        default:
            break
        }
    }
}

// MARK: - Navigation

extension VueWeb: WKNavigationDelegate, WKUIDelegate {

    /// Ce qui n'est pas la page elle-même part vers l'application concernée.
    ///
    /// Même règle que sur Android : la page vit en file://, donc toute
    /// adresse en http(s) la quitte — de même que sms:, tel: et mailto:.
    /// Sans cela, « Inviter sur TimeCool » et WhatsApp ne feraient rien.
    func webView(
        _ vue: WKWebView,
        decidePolicyFor action: WKNavigationAction,
        decisionHandler decide: @escaping (WKNavigationActionPolicy) -> Void
    ) {
        guard let url = action.request.url else {
            decide(.allow)
            return
        }

        if url.isFileURL {
            decide(.allow)
            return
        }

        if UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
            decide(.cancel)
            return
        }

        appelerJs("tcOuvertureImpossible", url.absoluteString)
        decide(.cancel)
    }

    /// La page appelle parfois window.open — WhatsApp, par exemple.
    /// Sans ceci, WebKit l'ignore en silence.
    func webView(
        _ vue: WKWebView,
        createWebViewWith configuration: WKWebViewConfiguration,
        for action: WKNavigationAction,
        windowFeatures: WKWindowFeatures
    ) -> WKWebView? {
        if let url = action.request.url, UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url)
        }
        return nil
    }
}
