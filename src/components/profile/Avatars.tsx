'use client';
import React from 'react';

// Each avatar is a React functional component.

const Avatar1 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#D27C5A" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#D27C5A" />
        <path d="M91 70C91 55.0721 78.9279 43 64 43C49.0721 43 37 55.0721 37 70H91Z" fill="#2C3E50" />
        <rect x="54" y="80" width="20" height="20" fill="#F4A261" />
    </svg>
);

const Avatar2 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#F4A261" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#F4A261" />
        <path d="M37 68C37 54.5 45 43 64 43C83 43 91 54.5 91 68H37Z" fill="#F2C94C" />
        <rect x="54" y="80" width="20" height="20" fill="#2A9D8F" />
    </svg>
);

const Avatar3 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#8E5E4A" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#8E5E4A" />
        <path d="M91 66C91 51.0721 78.9279 39 64 39C49.0721 39 37 51.0721 37 66H91Z" fill="#2C3E50" />
        <path d="M50 49C50 45.6863 52.6863 43 56 43H72C75.3137 43 78 45.6863 78 49V66H50V49Z" fill="#2C3E50" />
        <rect x="54" y="80" width="20" height="20" fill="#E76F51" />
    </svg>
);

const Avatar4 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#F4A261" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#F4A261" />
        <path d="M91 80C91 60.1177 79.2254 44 64 44C48.7746 44 37 60.1177 37 80H91Z" fill="#3D405B" />
        <rect x="54" y="80" width="20" height="20" fill="#E07A5F" />
    </svg>
);

const Avatar5 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#C58C85" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#C58C85" />
        <path d="M91 83C91 63.1177 79.2254 47 64 47C48.7746 47 37 63.1177 37 83H91Z" fill="#6A4C93" />
        <rect x="54" y="80" width="20" height="20" fill="#E76F51" />
    </svg>
);

const Avatar6 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#F4A261" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#F4A261" />
        <path d="M91 68C91 53.0721 78.9279 41 64 41C49.0721 41 37 53.0721 37 68H91Z" fill="#2C3E50" />
        <path d="M64 74C74.4934 74 83 82.5066 83 93V111H45V93C45 82.5066 53.5066 74 64 74Z" fill="#2C3E50"/>
        <rect x="54" y="80" width="20" height="20" fill="#264653" />
    </svg>
);

const Avatar7 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#D27C5A" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#D27C5A" />
        <path d="M37 83H91V94H37V83Z" fill="#4A4A4A"/>
        <path d="M37 47H91V83H37V47Z" fill="#4A4A4A"/>
        <rect x="54" y="80" width="20" height="20" fill="#E76F51" />
    </svg>
);
  
const Avatar8 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="94" r="38" fill="#8E5E4A" />
        <path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#8E5E4A" />
        <path d="M91 75C91 58.4315 78.9279 45 64 45C49.0721 45 37 58.4315 37 75H91Z" fill="#E76F51" />
        <rect x="54" y="80" width="20" height="20" fill="#2A9D8F" />
    </svg>
);

const avatarToString = (avatarComponent: React.FC): string => {
    // This is a simplified "renderer" for the purpose of getting a string representation.
    // In a real app, you'd use ReactDOMServer.renderToString, but that's not available here.
    if (avatarComponent === Avatar1) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#D27C5A" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#D27C5A" /><path d="M91 70C91 55.0721 78.9279 43 64 43C49.0721 43 37 55.0721 37 70H91Z" fill="#2C3E50" /><rect x="54" y="80" width="20" height="20" fill="#F4A261" /></svg>`;
    if (avatarComponent === Avatar2) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#F4A261" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#F4A261" /><path d="M37 68C37 54.5 45 43 64 43C83 43 91 54.5 91 68H37Z" fill="#F2C94C" /><rect x="54" y="80" width="20" height="20" fill="#2A9D8F" /></svg>`;
    if (avatarComponent === Avatar3) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#8E5E4A" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#8E5E4A" /><path d="M91 66C91 51.0721 78.9279 39 64 39C49.0721 39 37 51.0721 37 66H91Z" fill="#2C3E50" /><path d="M50 49C50 45.6863 52.6863 43 56 43H72C75.3137 43 78 45.6863 78 49V66H50V49Z" fill="#2C3E50" /><rect x="54" y="80" width="20" height="20" fill="#E76F51" /></svg>`;
    if (avatarComponent === Avatar4) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#F4A261" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#F4A261" /><path d="M91 80C91 60.1177 79.2254 44 64 44C48.7746 44 37 60.1177 37 80H91Z" fill="#3D405B" /><rect x="54" y="80" width="20" height="20" fill="#E07A5F" /></svg>`;
    if (avatarComponent === Avatar5) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#C58C85" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#C58C85" /><path d="M91 83C91 63.1177 79.2254 47 64 47C48.7746 47 37 63.1177 37 83H91Z" fill="#6A4C93" /><rect x="54" y="80" width="20" height="20" fill="#E76F51" /></svg>`;
    if (avatarComponent === Avatar6) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#F4A261" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#F4A261" /><path d="M91 68C91 53.0721 78.9279 41 64 41C49.0721 41 37 53.0721 37 68H91Z" fill="#2C3E50" /><path d="M64 74C74.4934 74 83 82.5066 83 93V111H45V93C45 82.5066 53.5066 74 64 74Z" fill="#2C3E50"/><rect x="54" y="80" width="20" height="20" fill="#264653" /></svg>`;
    if (avatarComponent === Avatar7) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#D27C5A" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#D27C5A" /><path d="M37 83H91V94H37V83Z" fill="#4A4A4A"/><path d="M37 47H91V83H37V47Z" fill="#4A4A4A"/><rect x="54" y="80" width="20" height="20" fill="#E76F51" /></svg>`;
    if (avatarComponent === Avatar8) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="94" r="38" fill="#8E5E4A" /><path d="M64 56C49.0721 56 37 68.0721 37 83V94H91V83C91 68.0721 78.9279 56 64 56Z" fill="#8E5E4A" /><path d="M91 75C91 58.4315 78.9279 45 64 45C49.0721 45 37 58.4315 37 75H91Z" fill="#E76F51" /><rect x="54" y="80" width="20" height="20" fill="#2A9D8F" /></svg>`;
    return '';
}

export const AvatarList = [
    { component: Avatar1, svgString: avatarToString(Avatar1) },
    { component: Avatar2, svgString: avatarToString(Avatar2) },
    { component: Avatar3, svgString: avatarToString(Avatar3) },
    { component: Avatar4, svgString: avatarToString(Avatar4) },
    { component: Avatar5, svgString: avatarToString(Avatar5) },
    { component: Avatar6, svgString: avatarToString(Avatar6) },
    { component: Avatar7, svgString: avatarToString(Avatar7) },
    { component: Avatar8, svgString: avatarToString(Avatar8) },
]
