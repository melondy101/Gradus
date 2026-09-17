import { NextResponse } from "next/server";
import { CURRENT_APP_VERSION, compareVersions, formatBytes, formatReleaseDate } from "@/lib/version";

export const dynamic = "force-dynamic";

export interface UpdateResponseData {
  ok: boolean;
  currentVersion: string;
  latestVersion: string;
  hasUpdate: boolean;
  title?: string;
  releaseNotes?: string;
  publishedAt?: string;
  downloadUrl: string;
  releaseUrl: string;
  apkSize?: string;
  isApkDirect: boolean;
  repo: string;
  message?: string;
}

export async function GET() {
  const repo =
    process.env.NEXT_PUBLIC_GITHUB_REPO ||
    process.env.GITHUB_REPOSITORY ||
    "dae201459/TalkTask";

  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "Gradus-Mobile-App-Updater",
  };

  if (process.env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
      headers,
      cache: "no-store",
    });

    if (res.status === 404) {
      // 仓库暂无 Release
      return NextResponse.json<UpdateResponseData>({
        ok: true,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        hasUpdate: false,
        downloadUrl: `https://github.com/${repo}/releases`,
        releaseUrl: `https://github.com/${repo}/releases`,
        isApkDirect: false,
        repo,
        message: "当前暂无已发布的安装包 Release，您使用的是最新开发版本。",
      });
    }

    if (!res.ok) {
      return NextResponse.json<UpdateResponseData>(
        {
          ok: false,
          currentVersion: CURRENT_APP_VERSION,
          latestVersion: CURRENT_APP_VERSION,
          hasUpdate: false,
          downloadUrl: `https://github.com/${repo}/releases`,
          releaseUrl: `https://github.com/${repo}/releases`,
          isApkDirect: false,
          repo,
          message: `无法获取 GitHub 更新信息 (状态码: ${res.status})`,
        },
        { status: 200 }
      );
    }

    const release = await res.json();
    const latestRawVersion = release.tag_name || release.name || CURRENT_APP_VERSION;
    const latestClean = latestRawVersion.replace(/^v/i, "");
    const hasUpdate = compareVersions(CURRENT_APP_VERSION, latestClean) > 0;

    // 寻找 Release 附件中后缀为 .apk 的安装包
    interface GitHubAsset {
      name: string;
      browser_download_url: string;
      size: number;
    }

    const assets: GitHubAsset[] = Array.isArray(release.assets) ? release.assets : [];
    const apkAsset = assets.find((a) => a.name.toLowerCase().endsWith(".apk"));

    const downloadUrl = apkAsset ? apkAsset.browser_download_url : release.html_url;
    const isApkDirect = Boolean(apkAsset);
    const apkSize = apkAsset ? formatBytes(apkAsset.size) : undefined;

    return NextResponse.json<UpdateResponseData>({
      ok: true,
      currentVersion: CURRENT_APP_VERSION,
      latestVersion: latestClean,
      hasUpdate,
      title: release.name || release.tag_name,
      releaseNotes: release.body || "常规性能优化与体验改进",
      publishedAt: formatReleaseDate(release.published_at),
      downloadUrl,
      releaseUrl: release.html_url,
      apkSize,
      isApkDirect,
      repo,
      message: hasUpdate ? `发现新版本 v${latestClean}` : `当前已是最新版本 (v${CURRENT_APP_VERSION})`,
    });
  } catch (error) {
    console.error("[check-update] failed to fetch GitHub releases:", error);
    return NextResponse.json<UpdateResponseData>(
      {
        ok: false,
        currentVersion: CURRENT_APP_VERSION,
        latestVersion: CURRENT_APP_VERSION,
        hasUpdate: false,
        downloadUrl: `https://github.com/${repo}/releases`,
        releaseUrl: `https://github.com/${repo}/releases`,
        isApkDirect: false,
        repo,
        message: "检测更新失败，请检查网络连接。",
      },
      { status: 200 }
    );
  }
}
