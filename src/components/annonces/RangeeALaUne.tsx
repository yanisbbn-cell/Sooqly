import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { VignetteSansPhoto } from "./VignetteSansPhoto";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";

import { Texte } from "@/components/Texte";
import { photoPrincipale, type AnnonceResume } from "@/lib/annonces";
import { tarifCourt } from "@/lib/location";
import { urlPhoto } from "@/lib/photos";
import { formaterNombre } from "@/lib/prix";
import type { Categorie } from "@/lib/referentiel";
import { colors } from "@/theme";

import { couleursTuile } from "./tuile";

/** Rangée « À la une » : annonces de pros mises en avant, toujours signalées « Sponsorisé ». Jamais de défilement automatique. */
export function RangeeALaUne({
  annonces,
  categories,
}: {
  annonces: AnnonceResume[];
  categories: Categorie[] | null;
}) {
  const { t } = useTranslation();
  if (!annonces.length) return null;
  return (
    <View style={{ gap: 10, marginTop: 18 }}>
      <Texte
        variante="titre"
        poids={700}
        style={styles.titre}
        accessibilityRole="header"
      >
        {t("miseEnAvant.alaUne")}
      </Texte>
      {annonces.length === 1 ? (
        <BanniereUnique
          annonce={annonces[0]!}
          categorie={categories?.find((x) => x.cle === annonces[0]!.categorie)}
        />
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.rangee}
        >
          {annonces.map((a) => {
            const c = categories?.find((x) => x.cle === a.categorie);
            const tuile = couleursTuile(c?.icone ?? "grid");
            const photo = photoPrincipale(a);
            const tarif =
              a.type === "location"
                ? (tarifCourt(a.tarifs ?? []) ?? a.tarifs?.[0] ?? null)
                : null;
            return (
              <Pressable
                key={a.id}
                onPress={() =>
                  router.push({
                    pathname: "/annonce/[id]",
                    params: { id: a.id },
                  })
                }
                accessibilityRole="button"
                accessibilityLabel={`${a.titre}, ${t("carte.sponsorise")}`}
                style={({ pressed }) => [
                  styles.carte,
                  pressed && { opacity: 0.85 },
                ]}
              >
                <View style={[styles.image, { backgroundColor: tuile.fond }]}>
                  {photo ? (
                    <Image
                      source={{ uri: urlPhoto(photo) }}
                      style={StyleSheet.absoluteFill}
                      resizeMode="cover"
                    />
                  ) : (
                    <VignetteSansPhoto
                      icone={c?.icone ?? "grid"}
                      tailleIcone={32}
                    />
                  )}
                </View>
                <View style={{ padding: 10, gap: 2 }}>
                  <Texte
                    poids={600}
                    style={{ fontSize: 11, color: colors.brunMoyen }}
                  >
                    {t("carte.sponsorise")}
                  </Texte>
                  <Texte style={{ fontSize: 13 }} numberOfLines={1}>
                    {a.titre}
                  </Texte>
                  <Texte variante="titre" poids={700} style={{ fontSize: 15 }}>
                    {a.type === "don"
                      ? t("carte.gratuit")
                      : `${formaterNombre(tarif?.prix_da ?? a.prix_da)} ${t("da")}`}
                    {tarif ? ` ${t(`location.suffixe.${tarif.unite}`)}` : ""}
                  </Texte>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

/**
 * Une seule annonce à la une : bannière sur toute la largeur (photo à gauche, texte à droite),
 * au lieu d'une petite carte isolée. Toujours signalée « Sponsorisé ».
 */
function BanniereUnique({
  annonce: a,
  categorie: c,
}: {
  annonce: AnnonceResume;
  categorie: Categorie | undefined;
}) {
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const photo = photoPrincipale(a);
  const tarif =
    a.type === "location"
      ? (tarifCourt(a.tarifs ?? []) ?? a.tarifs?.[0] ?? null)
      : null;
  const large = width >= 600;
  return (
    <Pressable
      onPress={() =>
        router.push({ pathname: "/annonce/[id]", params: { id: a.id } })
      }
      accessibilityRole="button"
      accessibilityLabel={`${a.titre}, ${t("carte.sponsorise")}`}
      style={({ pressed }) => [
        styles.banniere,
        pressed && { opacity: 0.92, transform: [{ scale: 0.99 }] },
      ]}
    >
      <View style={[styles.banniereImage, { width: large ? "42%" : "46%" }]}>
        {photo ? (
          <Image
            source={{ uri: urlPhoto(photo) }}
            style={StyleSheet.absoluteFill}
            resizeMode="cover"
          />
        ) : (
          <VignetteSansPhoto
            icone={c?.icone ?? "grid"}
            tailleIcone={large ? 44 : 34}
          />
        )}
      </View>
      <View style={styles.banniereTexte}>
        <View style={styles.sponsorise}>
          <Texte poids={700} style={{ fontSize: 11, color: colors.brunMoyen }}>
            {t("carte.sponsorise")}
          </Texte>
        </View>
        <Texte
          variante="titre"
          poids={700}
          style={{ fontSize: large ? 20 : 16, lineHeight: large ? 26 : 21 }}
          numberOfLines={2}
        >
          {a.titre}
        </Texte>
        <Texte
          variante="titre"
          poids={700}
          style={{ fontSize: large ? 22 : 18 }}
        >
          {a.type === "don"
            ? t("carte.gratuit")
            : `${formaterNombre(tarif?.prix_da ?? a.prix_da)} ${t("da")}`}
          {tarif ? (
            <Texte
              style={{ fontSize: 13, color: colors.brunMoyen }}
            >{` ${t(`location.suffixe.${tarif.unite}`)}`}</Texte>
          ) : null}
        </Texte>
        {a.ville ? (
          <Texte style={{ fontSize: 13, color: colors.brunMoyen }}>
            {a.ville}
          </Texte>
        ) : null}
        <Texte poids={700} style={styles.voir}>
          {t("miseEnAvant.voir")}
        </Texte>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  titre: { fontSize: 20, paddingHorizontal: 20 },
  rangee: { paddingHorizontal: 20, gap: 12 },
  carte: {
    width: 200,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: colors.carte,
    borderWidth: 1.5,
    borderColor: colors.sable3,
  },
  image: {
    aspectRatio: 4 / 3,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  banniere: {
    marginHorizontal: 20,
    flexDirection: "row",
    minHeight: 150,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: colors.carte,
    borderWidth: 1.5,
    borderColor: colors.sable3,
    boxShadow: "0px 4px 14px rgba(59, 45, 34, 0.10)",
  },
  banniereImage: {
    alignSelf: "stretch",
    minHeight: 150,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  banniereTexte: { flex: 1, padding: 16, gap: 6, justifyContent: "center" },
  sponsorise: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    backgroundColor: colors.sable2,
  },
  voir: { fontSize: 13, color: colors.accentFonce, marginTop: 2 },
});
