import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import connectDB from '@/lib/mongodb';
import Link from '@/models/Link';
import Click from '@/models/Click';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
    }

    const { id } = await params;
    await connectDB();

    // Verifica che il link appartenga all'utente
    const link = await Link.findById(id).populate('domainId');
    if (!link || link.userId.toString() !== session.user.id) {
      return NextResponse.json({ error: 'Link non trovato' }, { status: 404 });
    }

    // Ottieni i parametri di query per filtri
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Query per i click
    const clicks = await Click.find({
      linkId: id,
      timestamp: { $gte: startDate }
    }).sort({ timestamp: -1 });

    // Statistiche aggregate
    const totalClicks = clicks.length;
    const uniqueIPs = new Set(clicks.map(click => click.ip)).size;
    
    // Click per giorno
    const clicksByDay = clicks.reduce((acc, click) => {
      const day = click.timestamp.toISOString().split('T')[0];
      acc[day] = (acc[day] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Top referer
    const refererCounts = clicks.reduce((acc, click) => {
      const referer = click.referer || 'Direct';
      acc[referer] = (acc[referer] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topReferers = Object.entries(refererCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10);

    // Top target URLs (per link con rotazione)
    const targetUrlCounts = clicks.reduce((acc, click) => {
      acc[click.targetUrl] = (acc[click.targetUrl] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topTargetUrls = Object.entries(targetUrlCounts)
      .sort(([,a], [,b]) => b - a);

    // Click per ora del giorno
    const clicksByHour = clicks.reduce((acc, click) => {
      const hour = click.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    // Click recenti (ultimi 50)
    const recentClicks = clicks.slice(0, 50).map(click => ({
      id: click._id,
      targetUrl: click.targetUrl,
      ip: click.ip,
      userAgent: click.userAgent,
      referer: click.referer,
      timestamp: click.timestamp,
    }));

    return NextResponse.json({
      link: {
        id: link._id,
        shortPath: link.shortPath,
        domain: link.domainId.domain,
        totalClicks: link.totalClicks,
        createdAt: link.createdAt,
        lastUsed: link.lastUsed,
      },
      analytics: {
        totalClicks,
        uniqueIPs,
        clicksByDay,
        topReferers,
        topTargetUrls,
        clicksByHour,
        recentClicks,
        period: {
          days,
          startDate,
          endDate: new Date(),
        }
      }
    });

  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: 'Errore interno del server' },
      { status: 500 }
    );
  }
}
