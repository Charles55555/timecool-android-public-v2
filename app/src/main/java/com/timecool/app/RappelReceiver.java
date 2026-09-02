package com.timecool.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/**
 * Affiche le rappel d'un rendez-vous a l'heure programmee.
 *
 * Un BroadcastReceiver plutot qu'un service : le systeme le reveille
 * meme application fermee, ce qui est tout l'interet d'un rappel. Le
 * titre du rendez-vous transite par l'Intent et n'est jamais ecrit sur
 * le disque : il ne survit pas a l'affichage de la notification.
 */
public class RappelReceiver extends BroadcastReceiver {

    public static final String CANAL_SONORE = "timecool_rappels";
    public static final String CANAL_SILENCIEUX = "timecool_rappels_silencieux";

    public static final String EXTRA_TITRE = "titre";
    public static final String EXTRA_TEXTE = "texte";
    public static final String EXTRA_ID = "id";
    public static final String EXTRA_SILENCIEUX = "silencieux";

    @Override
    public void onReceive(Context contexte, Intent intent) {
        String titre = intent.getStringExtra(EXTRA_TITRE);
        String texte = intent.getStringExtra(EXTRA_TEXTE);
        int id = intent.getIntExtra(EXTRA_ID, 0);
        boolean silencieux = intent.getBooleanExtra(EXTRA_SILENCIEUX, false);

        if (titre == null || titre.trim().isEmpty()) {
            titre = "Rendez-vous TimeCool";
        }

        NotificationManager gestionnaire =
            (NotificationManager) contexte.getSystemService(Context.NOTIFICATION_SERVICE);
        if (gestionnaire == null) {
            return;
        }

        // Ouvre l'application au clic. FLAG_IMMUTABLE est obligatoire
        // depuis Android 12 : sans lui la creation du PendingIntent leve
        // une exception et le rappel serait perdu.
        Intent ouvrir = new Intent(contexte, MainActivity.class);
        ouvrir.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent action = PendingIntent.getActivity(
            contexte, id, ouvrir,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        Notification.Builder b = new Notification.Builder(
            contexte, silencieux ? CANAL_SILENCIEUX : CANAL_SONORE);
        b.setContentTitle(titre);
        if (texte != null && !texte.trim().isEmpty()) {
            b.setContentText(texte);
        }
        b.setSmallIcon(android.R.drawable.ic_popup_reminder);
        b.setAutoCancel(true);
        b.setContentIntent(action);

        try {
            gestionnaire.notify(id, b.build());
        } catch (SecurityException e) {
            // Permission de notification revoquee entre la programmation
            // et l'echeance : on abandonne ce rappel sans faire tomber
            // l'application.
        }
    }
}
