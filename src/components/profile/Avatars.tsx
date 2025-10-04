'use client';
import React from 'react';

// Each avatar is a React functional component.

const Avatar1 = () => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#E6A1A1" />
    <path d="M86.4 99.2C86.4 86.9333 76.5333 77.0667 64.2667 77.0667C52 77.0667 42.1333 86.9333 42.1333 99.2" fill="#CF6A6A" />
    <path d="M102.4 86.4C102.4 70.2667 89.8667 57.6 74.1333 57.6C58.4 57.6 45.8667 70.2667 45.8667 86.4" fill="#333333" />
    <circle cx="83.2" cy="54.4" r="6.4" fill="#FFFFFF" />
    <circle cx="45.3333" cy="54.4" r="6.4" fill="#FFFFFF" />
  </svg>
);

const Avatar2 = () => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#A1E6B8" />
    <path d="M64 89.6C51.7333 89.6 41.8667 99.4667 41.8667 111.733V128H86.1333V111.733C86.1333 99.4667 76.2667 89.6 64 89.6Z" fill="#74CF90" />
    <path d="M96 70.4C96 52.5333 81.6 38.4 64 38.4C46.4 38.4 32 52.5333 32 70.4" fill="#333333" />
    <rect x="51.2" y="60.8" width="25.6" height="6.4" fill="#FFFFFF" />
  </svg>
);

const Avatar3 = () => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#A1C5E6" />
    <path d="M96 115.2C96 102.933 86.1333 93.0667 73.8667 93.0667H54.1333C41.8667 93.0667 32 102.933 32 115.2V128H96V115.2Z" fill="#6A99CF" />
    <path d="M83.2 57.6C83.2 41.4667 70.6667 28.8 54.9333 28.8C39.2 28.8 26.6667 41.4667 26.6667 57.6" fill="#333333" />
    <circle cx="70.4" cy="51.2" r="6.4" fill="#FFFFFF" />
    <circle cx="38.4" cy="51.2" r="6.4" fill="#FFFFFF" />
  </svg>
);

const Avatar4 = () => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#E6DDA1" />
    <rect x="38.4" y="89.6" width="51.2" height="12.8" fill="#CFAE78" />
    <path d="M89.6 51.2C89.6 35.0667 76.8 22.4 60.8 22.4C44.8 22.4 32 35.0667 32 51.2V64H89.6V51.2Z" fill="#333333" />
    <circle cx="76.8" cy="51.2" r="6.4" fill="#FFFFFF" />
    <circle cx="44.8" cy="51.2" r="6.4" fill="#FFFFFF" />
  </svg>
);

const Avatar5 = () => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#C5A1E6" />
    <path d="M83.2 96C83.2 83.7333 73.3333 73.8667 61.0667 73.8667C48.8 73.8667 38.9333 83.7333 38.9333 96" fill="#A56ADF" />
    <path d="M99.2 64C99.2 45.6 86.4 32 64 32C41.6 32 28.8 45.6 28.8 64" fill="#333333" />
    <circle cx="80" cy="57.6" r="6.4" fill="#FFFFFF" />
    <circle cx="48" cy="57.6" r="6.4" fill="#FFFFFF" />
  </svg>
);

const Avatar6 = () => (
  <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
    <circle cx="64" cy="64" r="64" fill="#A1E6E6" />
    <path d="M64 83.2C51.7333 83.2 41.8667 93.0667 41.8667 105.333V128H86.1333V105.333C86.1333 93.0667 76.2667 83.2 64 83.2Z" fill="#6ACFCF" />
    <path d="M92.8 57.6C92.8 41.4667 80 28.8 64 28.8C48 28.8 35.2 41.4667 35.2 57.6" fill="#333333" />
    <rect x="54.4" y="51.2" width="19.2" height="6.4" fill="#FFFFFF" />
  </svg>
);

const Avatar7 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="64" r="64" fill="#F0B27A" />
      <path d="M76.8 96C76.8 83.7333 66.9333 73.8667 54.6667 73.8667C42.4 73.8667 32.5333 83.7333 32.5333 96" fill="#D98A4F" />
      <path d="M92.8 44.8C92.8 26.9333 78.4 12.8 60.8 12.8C43.2 12.8 28.8 26.9333 28.8 44.8V57.6H92.8V44.8Z" fill="#333333" />
      <circle cx="76.8" cy="51.2" r="6.4" fill="#FFFFFF" />
      <circle cx="44.8" cy="51.2" r="6.4" fill="#FFFFFF" />
    </svg>
);
  
const Avatar8 = () => (
    <svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg">
      <circle cx="64" cy="64" r="64" fill="#82E0AA" />
      <rect x="44.8" y="89.6" width="38.4" height="12.8" fill="#58D68D" />
      <path d="M83.2 44.8C83.2 26.9333 68.8 12.8 51.2 12.8C33.6 12.8 19.2 26.9333 19.2 44.8V64H83.2V44.8Z" fill="#333333" />
      <circle cx="67.2" cy="51.2" r="6.4" fill="#FFFFFF" />
      <circle cx="35.2" cy="51.2" r="6.4" fill="#FFFFFF" />
    </svg>
);

const avatarToString = (avatarComponent: React.FC): string => {
    // This is a simplified "renderer" for the purpose of getting a string representation.
    // In a real app, you'd use ReactDOMServer.renderToString, but that's not available here.
    if (avatarComponent === Avatar1) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E6A1A1"/><path d="M86.4 99.2C86.4 86.9333 76.5333 77.0667 64.2667 77.0667C52 77.0667 42.1333 86.9333 42.1333 99.2" fill="#CF6A6A"/><path d="M102.4 86.4C102.4 70.2667 89.8667 57.6 74.1333 57.6C58.4 57.6 45.8667 70.2667 45.8667 86.4" fill="#333333"/><circle cx="83.2" cy="54.4" r="6.4" fill="#FFFFFF"/><circle cx="45.3333" cy="54.4" r="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar2) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#A1E6B8"/><path d="M64 89.6C51.7333 89.6 41.8667 99.4667 41.8667 111.733V128H86.1333V111.733C86.1333 99.4667 76.2667 89.6 64 89.6Z" fill="#74CF90"/><path d="M96 70.4C96 52.5333 81.6 38.4 64 38.4C46.4 38.4 32 52.5333 32 70.4" fill="#333333"/><rect x="51.2" y="60.8" width="25.6" height="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar3) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#A1C5E6"/><path d="M96 115.2C96 102.933 86.1333 93.0667 73.8667 93.0667H54.1333C41.8667 93.0667 32 102.933 32 115.2V128H96V115.2Z" fill="#6A99CF"/><path d="M83.2 57.6C83.2 41.4667 70.6667 28.8 54.9333 28.8C39.2 28.8 26.6667 41.4667 26.6667 57.6" fill="#333333"/><circle cx="70.4" cy="51.2" r="6.4" fill="#FFFFFF"/><circle cx="38.4" cy="51.2" r="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar4) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#E6DDA1"/><rect x="38.4" y="89.6" width="51.2" height="12.8" fill="#CFAE78"/><path d="M89.6 51.2C89.6 35.0667 76.8 22.4 60.8 22.4C44.8 22.4 32 35.0667 32 51.2V64H89.6V51.2Z" fill="#333333"/><circle cx="76.8" cy="51.2" r="6.4" fill="#FFFFFF"/><circle cx="44.8" cy="51.2" r="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar5) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#C5A1E6"/><path d="M83.2 96C83.2 83.7333 73.3333 73.8667 61.0667 73.8667C48.8 73.8667 38.9333 83.7333 38.9333 96" fill="#A56ADF"/><path d="M99.2 64C99.2 45.6 86.4 32 64 32C41.6 32 28.8 45.6 28.8 64" fill="#333333"/><circle cx="80" cy="57.6" r="6.4" fill="#FFFFFF"/><circle cx="48" cy="57.6" r="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar6) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#A1E6E6"/><path d="M64 83.2C51.7333 83.2 41.8667 93.0667 41.8667 105.333V128H86.1333V105.333C86.1333 93.0667 76.2667 83.2 64 83.2Z" fill="#6ACFCF"/><path d="M92.8 57.6C92.8 41.4667 80 28.8 64 28.8C48 28.8 35.2 41.4667 35.2 57.6" fill="#333333"/><rect x="54.4" y="51.2" width="19.2" height="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar7) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#F0B27A"/><path d="M76.8 96C76.8 83.7333 66.9333 73.8667 54.6667 73.8667C42.4 73.8667 32.5333 83.7333 32.5333 96" fill="#D98A4F"/><path d="M92.8 44.8C92.8 26.9333 78.4 12.8 60.8 12.8C43.2 12.8 28.8 26.9333 28.8 44.8V57.6H92.8V44.8Z" fill="#333333"/><circle cx="76.8" cy="51.2" r="6.4" fill="#FFFFFF"/><circle cx="44.8" cy="51.2" r="6.4" fill="#FFFFFF"/></svg>`;
    if (avatarComponent === Avatar8) return `<svg viewBox="0 0 128 128" xmlns="http://www.w3.org/2000/svg"><circle cx="64" cy="64" r="64" fill="#82E0AA"/><rect x="44.8" y="89.6" width="38.4" height="12.8" fill="#58D68D"/><path d="M83.2 44.8C83.2 26.9333 68.8 12.8 51.2 12.8C33.6 12.8 19.2 26.9333 19.2 44.8V64H83.2V44.8Z" fill="#333333"/><circle cx="67.2" cy="51.2" r="6.4" fill="#FFFFFF"/><circle cx="35.2" cy="51.2" r="6.4" fill="#FFFFFF"/></svg>`;
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
