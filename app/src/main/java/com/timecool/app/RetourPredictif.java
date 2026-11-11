package com.timecool.app;

import android.annotation.TargetApi;
import android.app.Activity;
import android.webkit.WebView;
import android.window.OnBackInvokedCallback;
import android.window.OnBackInvokedDispatcher;

/**
 * Retour arriere pour une appli ciblant le niveau d'API 36 (version Google Play).
 *
 * Mission 79 : a ce niveau, sur Android 16, onBackPressed n'est plus appele ;
 * le geste retour passe par OnBackInvokedDispatcher. Le rappel n'est inscrit
 * que tant que la WebView a une page precedente : sinon le systeme garde la
 * main (retour a l'ecran d'accueil, avec son animation), exactement ce que
 * faisait super.onBackPressed().
 *
 * Classe a part : elle n'est chargee que sur Android 13 et plus, ou ces
 * classes existent.
 */
@TargetApi(33)
final class RetourPredictif {

    private final Activity activite;
    private final WebView vue;
    private boolean inscrit;

    private final OnBackInvokedCallback rappel = new OnBackInvokedCallback() {
        @Override
        public void onBackInvoked() {
            if (vue.canGoBack()) {
                vue.goBack();
            }
            mettreAJour();
        }
    };

    RetourPredictif(Activity activite, WebView vue) {
        this.activite = activite;
        this.vue = vue;
    }

    /** A appeler a chaque changement d'historique de la WebView. */
    void mettreAJour() {
        boolean voulu = vue.canGoBack();
        OnBackInvokedDispatcher d = activite.getOnBackInvokedDispatcher();
        if (voulu && !inscrit) {
            d.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT, rappel);
            inscrit = true;
        } else if (!voulu && inscrit) {
            d.unregisterOnBackInvokedCallback(rappel);
            inscrit = false;
        }
    }
}
