import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Seite nicht gefunden</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Diese Seite existiert nicht oder wurde verschoben.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Zur Startseite
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "carforms — Die Community für Auto-Enthusiasten" },
      {
        name: "description",
        content:
          "carforms – Die deutsche Community für Auto-Enthusiasten. JDM, Stance, Drift und mehr. Teile deinen Build, diskutiere Designs, werde Teil der Szene.",
      },
      { property: "og:title", content: "carforms — Die Community für Auto-Enthusiasten" },
      { property: "og:description", content: "carforms – Die deutsche Community für Auto-Enthusiasten. JDM, Stance, Drift und mehr. Teile deinen Build, diskutiere Designs, werde Teil der Szene." },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "carforms — Die Community für Auto-Enthusiasten" },
      { name: "twitter:description", content: "carforms – Die deutsche Community für Auto-Enthusiasten. JDM, Stance, Drift und mehr. Teile deinen Build, diskutiere Designs, werde Teil der Szene." },
      { property: "og:image", content: "https://res.cloudinary.com/daqvusmpz/image/upload/v1778424461/IMG_7822_jghwgg.jpg" },
      { name: "twitter:image", content: "https://res.cloudinary.com/daqvusmpz/image/upload/v1778424461/IMG_7822_jghwgg.jpg" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Carforms",
          alternateName: "carforms",
          url: "https://carforms.de",
          description:
            "carforms – Die deutsche Community für Auto-Enthusiasten. JDM, Stance, Drift und mehr.",
          potentialAction: {
            "@type": "SearchAction",
            target: "https://carforms.de/search?q={search_term_string}",
            "query-input": "required name=search_term_string",
          },
          publisher: {
            "@type": "Organization",
            name: "Carforms",
            url: "https://carforms.de",
            logo: {
              "@type": "ImageObject",
              url: "https://res.cloudinary.com/daqvusmpz/image/upload/v1778424461/IMG_7822_jghwgg.jpg",
            },
          },
        }),
      },
    ],
    styles: [
      {
        children: `[data-lovable-badge], #lovable-badge, .lovable-badge, a[href*="lovable.dev"] { display: none !important; opacity: 0 !important; pointer-events: none !important; }`,
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <Header />
        <Outlet />
      </div>
      <Toaster theme="dark" />
    </AuthProvider>
  );
}
