'use client';
import React from 'react';

// Each avatar is a React functional component.

const MaleAvatar = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <circle cx="64" cy="50" r="22" fill="#2C3E50" />
        <path d="M102 111C102 88.9086 84.9817 71 64 71C43.0183 71 26 88.9086 26 111H102Z" fill="#2C3E50"/>
    </svg>
);

const FemaleAvatar = () => (
     <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
        <circle cx="64" cy="64" r="64" fill="#E0EBF5" />
        <path d="M91 66C91 51.0721 78.9279 39 64 39C49.0721 39 37 51.0721 37 66H91Z" fill="#E76F51" />
        <path d="M102 111C102 88.9086 84.9817 71 64 71C43.0183 71 26 88.9086 26 111H102Z" fill="#2C3E50"/>
    </svg>
);


const avatarToString = (avatarComponent: React.FC): string => {
    // This is a simplified "renderer" for the purpose of getting a string representation.
    // In a real app, you'd use ReactDOMServer.renderToString, but that's not available here.
    if (avatarComponent === MaleAvatar) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><circle cx="64" cy="50" r="22" fill="#2C3E50" /><path d="M102 111C102 88.9086 84.9817 71 64 71C43.0183 71 26 88.9086 26 111H102Z" fill="#2C3E50"/></svg>`;
    if (avatarComponent === FemaleAvatar) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E0EBF5" /><path d="M91 66C91 51.0721 78.9279 39 64 39C49.0721 39 37 51.0721 37 66H91Z" fill="#E76F51" /><path d="M102 111C102 88.9086 84.9817 71 64 71C43.0183 71 26 88.9086 26 111H102Z" fill="#2C3E50"/></svg>`;
    return '';
}

export const AvatarList = [
    { component: MaleAvatar, svgString: avatarToString(MaleAvatar) },
    { component: FemaleAvatar, svgString: avatarToString(FemaleAvatar) },
]
