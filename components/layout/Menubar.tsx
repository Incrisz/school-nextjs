"use client";

import Link from "next/link";
import Image, { type ImageLoader } from "next/image";
import { useCallback, useMemo, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { resolveBackendUrl } from "@/lib/config";

const DEFAULT_LOGO = "/assets/img/logo.png";
const DEFAULT_AVATAR = "/assets/img/figure/admin.jpg";

const passthroughLoader: ImageLoader = ({ src }) => src;

export function Menubar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, schoolContext, logout } = useAuth();

  const logoSrc = useMemo(() => {
    const customLogo = schoolContext.school?.logo_url;
    return customLogo ? resolveBackendUrl(customLogo) : DEFAULT_LOGO;
  }, [schoolContext.school?.logo_url]);

  const avatarSrc = useMemo(() => {
    const picture =
      (user as { avatar?: string | null })?.avatar ??
      (schoolContext.school as { logo_url?: string | null })?.logo_url;
    if (picture) {
      return resolveBackendUrl(picture);
    }
    return DEFAULT_AVATAR;
  }, [schoolContext.school, user]);

  const roleLabel = useMemo(() => {
    if (!user) {
      return "Administrator";
    }
    const directRole = (user as { role?: unknown }).role;
    if (typeof directRole === "string" && directRole.trim().length > 0) {
      return directRole.trim();
    }
    const roles = (user as { roles?: Array<{ name?: string | null }> }).roles;
    const derived = roles?.find((entry) => entry?.name)?.name?.trim();
    return derived && derived.length > 0 ? derived : "Administrator";
  }, [user]);

  const handleLogout = useCallback(async () => {
    await logout();
    router.push("/login");
  }, [logout, router]);

  const toggleDesktopSidebar = useCallback(() => {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) {
      return;
    }
    wrapper.classList.toggle("sidebar-collapsed");
    if (wrapper.classList.contains("sidebar-collapsed-mobile")) {
      wrapper.classList.remove("sidebar-collapsed-mobile");
    }
  }, []);

  const toggleMobileSidebar = useCallback(() => {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) {
      return;
    }
    wrapper.classList.toggle("sidebar-collapsed-mobile");
    if (wrapper.classList.contains("sidebar-collapsed-mobile")) {
      wrapper.classList.remove("sidebar-collapsed");
    }
  }, []);

  useEffect(() => {
    const wrapper = document.getElementById("wrapper");
    if (!wrapper) {
      return;
    }
    wrapper.classList.remove("sidebar-collapsed-mobile");
  }, [pathname]);

  return (
    <div className="navbar navbar-expand-md header-menu-one bg-light">
      <div className="nav-bar-header-one">
        <div className="header-logo">
          <Link href="/v10/dashboard" className="d-flex align-items-center">
            <Image
              id="menubar-school-logo"
              src={logoSrc}
              alt="School logo"
              width={120}
              height={36}
              unoptimized
              priority
              loader={passthroughLoader}
            />
          </Link>
        </div>
        <div className="toggle-button sidebar-toggle">
          <button
            type="button"
            className="item-link"
            onClick={toggleDesktopSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="btn-icon-wrap">
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </div>
      <div className="d-md-none mobile-nav-bar">
        <button
          className="navbar-toggler pulse-animation"
          type="button"
          data-toggle="collapse"
          data-target="#mobile-navbar"
          aria-expanded="false"
        >
          <i className="far fa-arrow-alt-circle-down" />
        </button>
        <button
          type="button"
          className="navbar-toggler sidebar-toggle-mobile"
          onClick={toggleMobileSidebar}
          aria-label="Toggle sidebar"
        >
          <i className="fas fa-bars" />
        </button>
      </div>
      <div className="header-main-menu collapse navbar-collapse" id="mobile-navbar">
        <ul className="navbar-nav">
          <li className="navbar-item header-search-bar">
            <div className="input-group stylish-input-group">
              <span className="input-group-addon">
                <button type="submit">
                  <span className="flaticon-search" aria-hidden="true" />
                </button>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Find Something . . ."
              />
            </div>
          </li>
        </ul>
        <ul className="navbar-nav">
          <li className="navbar-item dropdown header-admin">
            <button
              className="navbar-nav-link dropdown-toggle"
              type="button"
              data-toggle="dropdown"
              aria-expanded="false"
            >
              <div className="admin-title">
                <h5 className="item-title">{user?.name ?? "Authenticated User"}</h5>
                <span>{roleLabel}</span>
              </div>
              <div className="admin-img">
                <Image
                  src={avatarSrc}
                  alt="Account avatar"
                  width={40}
                  height={40}
                  unoptimized
                  loader={passthroughLoader}
                />
              </div>
            </button>
            <div className="dropdown-menu dropdown-menu-right">
              <div className="item-header">
                <h6 className="item-title">{user?.name ?? "Account"}</h6>
              </div>
              <div className="item-content">
                <ul className="settings-list">
                  <li>
                    <Link href="/v10/profile" className="d-flex align-items-center">
                      <i className="flaticon-user" />
                      <span className="ml-2">My Profile</span>
                    </Link>
                  </li>
                  <li>
                    <button
                      type="button"
                      className="d-flex align-items-center"
                      onClick={handleLogout}
                    >
                      <i className="flaticon-turn-off" />
                      <span className="ml-2">Log Out</span>
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </div>
  );
}
