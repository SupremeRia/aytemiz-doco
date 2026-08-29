import Link from "next/link";
import { Bell, ChevronRight, MapPin } from "lucide-react";
import { AppNav } from "@/components/app-nav";
import { Brand } from "@/components/brand";
import { AnnouncementCard, TaskCard } from "@/components/ui/content-cards";
import { Badge, Card, EmptyState, IconButton, SectionHeader } from "@/components/ui/primitives";
import { getDashboardContent, getMyStations, getProfile, hasAdminAccess } from "@/lib/data";
import { listNews } from "@/lib/news";
import { loadOptionalData } from "@/lib/optional-data";

export default async function Dashboard() {
  const [stations, profile, isAdmin, content, news] = await Promise.all([
    getMyStations(),
    getProfile(),
    hasAdminAccess(),
    loadOptionalData(getDashboardContent(), { tasks: [], announcements: [] }, "dashboard.content"),
    loadOptionalData(listNews(undefined, 8), { items: [], error: null }, "dashboard.news"),
  ]);

  return (
    <main className="shell app-shell">
      <header className="flex items-center justify-between">
        <Brand />
        <Link href="/notifications">
          <IconButton aria-label="Bildirim merkezi"><Bell size={20} /></IconButton>
        </Link>
      </header>

      <section className="dashboard-hero">
        <p className="eyebrow">Bugünkü çalışma alanınız</p>
        <h1>İyi günler, {profile?.first_name ?? "Kullanıcı"}</h1>
        <p className="muted">İstasyonlarınıza, görevlerinize ve güncel duyurulara buradan ulaşabilirsiniz.</p>
      </section>

      <section id="stations" className="dashboard-section">
        <SectionHeader title="İstasyonlarım" description="Erişiminiz bulunan çalışma alanları" action={<Badge>{stations.length} istasyon</Badge>} />
        {stations.length ? (
          <div className="station-grid">
            {stations.map((station) => (
              <Link key={station.id} href={`/station/${station.slug}`} className="ui-card station-card">
                <div className="card-row">
                  <span className="station-icon"><MapPin /></span>
                  <ChevronRight className="muted" />
                </div>
                <p className="muted">{station.city}</p>
                <h3>{station.name}</h3>
                <Badge tone={station.is_active ? "success" : "neutral"}>{station.is_active ? "Aktif" : "Pasif"}</Badge>
              </Link>
            ))}
          </div>
        ) : (
          <Card><EmptyState title="İstasyon atamanız yok" description="Bir yetkili istasyon erişimi verdiğinde çalışma alanınız burada görünecek." /></Card>
        )}
      </section>

      <div className="dashboard-columns">
        <section id="tasks" className="dashboard-section">
          <SectionHeader title="Görevlerim" description="Size atanan açık görevler" />
          {content.tasks.length ? (
            <div className="content-stack">{content.tasks.map((task) => <TaskCard key={task.id} title={task.title} status={task.status} />)}</div>
          ) : (
            <Card><EmptyState title="Henüz aktif göreviniz yok" description="Size atanan görevler burada görünecek." /></Card>
          )}
        </section>

        <section className="dashboard-section">
          <SectionHeader title="Duyurular" description="Erişebildiğiniz son bildirimler" />
          {content.announcements.length ? (
            <div className="content-stack">{content.announcements.map((item) => <AnnouncementCard key={item.id} title={item.title} body={item.body} />)}</div>
          ) : (
            <Card><EmptyState title="Henüz yeni duyuru yok" description="Yeni duyurular burada görünecek." /></Card>
          )}
        </section>
      </div>

      <section className="dashboard-section">
        <SectionHeader title="Haberler" description="Kurumsal gelişmeler ve kampanyalar" />
        {news.items.length ? (
          <div className="news-strip">
            {news.items.map((item) => (
              <Link href={`/news/${item.id}`} key={item.id} className="ui-card news-card">
                {item.cover_url ? <span className="news-card-cover" style={{ backgroundImage: `url(${item.cover_url})` }} /> : null}
                <small>{new Date(item.publish_at).toLocaleDateString("tr-TR")}</small>
                <h3>{item.title}</h3>
                <p className="muted">{item.summary}</p>
                <strong>Devamını Oku</strong>
              </Link>
            ))}
          </div>
        ) : (
          <Card><EmptyState title="Henüz haber yayınlanmadı" description="Yayınlanan kurumsal haberler burada görünecek." /></Card>
        )}
      </section>

      <AppNav isAdmin={isAdmin} fallbackStation={stations[0]?.slug} />
    </main>
  );
}
