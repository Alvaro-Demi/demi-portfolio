import { Component } from '@angular/core';
import { About } from '../../components/home/about/about';
import { Contact } from '../../components/home/contact/contact';
import { Hero } from '../../components/home/hero/hero';
import { Interlude } from '../../components/home/interlude/interlude';
import { PhotoStory } from '../../components/home/photo-story/photo-story';
import { Portraits } from '../../components/home/portraits/portraits';
import { SelectedWork } from '../../components/home/selected-work/selected-work';
import {
  ABOUT_PHOTO,
  CONTACT_EMAIL,
  HERO_PHOTO,
  INTERLUDE_CAPTION,
  INTERLUDE_PHOTO,
  PHOTO_STORIES,
  PORTRAITS,
  VIDEOCLIPS,
} from '../../data/home.data';

/** Página contenedora: reúne los datos y se los pasa a cada sección. */
@Component({
  selector: 'app-home',
  imports: [Hero, SelectedWork, Interlude, PhotoStory, Portraits, About, Contact],
  templateUrl: './home.html',
})
export class Home {
  protected readonly heroPhoto = HERO_PHOTO;
  protected readonly videoclips = VIDEOCLIPS;
  protected readonly interludePhoto = INTERLUDE_PHOTO;
  protected readonly interludeCaption = INTERLUDE_CAPTION;
  protected readonly stories = PHOTO_STORIES;
  protected readonly portraits = PORTRAITS;
  protected readonly aboutPhoto = ABOUT_PHOTO;
  protected readonly contactEmail = CONTACT_EMAIL;
}
