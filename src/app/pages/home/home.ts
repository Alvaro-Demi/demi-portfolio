import { Component } from '@angular/core';
import { About } from '../../components/home/about/about';
import { Backdrop } from '../../components/home/backdrop/backdrop';
import { Contact } from '../../components/home/contact/contact';
import { FilmStrip } from '../../components/home/film-strip/film-strip';
import { Hero } from '../../components/home/hero/hero';
import { PhotoStory } from '../../components/home/photo-story/photo-story';
import { Portraits } from '../../components/home/portraits/portraits';
import { SelectedWork } from '../../components/home/selected-work/selected-work';
import { SocialMedia } from '../../components/home/social-media/social-media';
import {
  ABOUT_PHOTO,
  CONTACT_EMAIL,
  INSTAGRAM_HANDLE,
  HERO_PHOTO,
  INTERLUDE_SEQUENCE,
  PHOTO_STORIES,
  PORTRAITS,
  PORTRAITS_INTRO,
  SERVICES,
  SOCIAL_REELS,
  VIDEOCLIPS,
} from '../../data/home.data';

/** Página contenedora: reúne los datos y se los pasa a cada sección. */
@Component({
  selector: 'app-home',
  imports: [Backdrop, Hero, SelectedWork, SocialMedia, FilmStrip, PhotoStory, Portraits, About, Contact],
  templateUrl: './home.html',
})
export class Home {
  protected readonly heroPhoto = HERO_PHOTO;
  protected readonly videoclips = VIDEOCLIPS;
  protected readonly socialReels = SOCIAL_REELS;
  protected readonly backstageFrames = INTERLUDE_SEQUENCE;
  protected readonly stories = PHOTO_STORIES;
  protected readonly portraits = PORTRAITS;
  protected readonly portraitsIntro = PORTRAITS_INTRO;
  protected readonly aboutPhoto = ABOUT_PHOTO;
  protected readonly contactEmail = CONTACT_EMAIL;
  protected readonly instagram = INSTAGRAM_HANDLE;
  protected readonly services = SERVICES;
}
