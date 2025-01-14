/**
 * Copyright (c) Microblink Ltd. All rights reserved.
 */

import {
  Component,
  Element,
  Host,
  h,
  Prop
} from '@stencil/core';

import { classNames } from '../../../utils/generic.helpers';

@Component({
  tag: 'mb-overlay',
  styleUrl: 'mb-overlay.scss',
  shadow: true,
})
export class MbOverlay {

  /**
   * Set to 'false' if overlay should not cover whole screen.
   */
  @Prop() fullscreen: boolean = true;

  /**
   * Set to 'true' if overlay should be visible.
   */
  @Prop() visible: boolean = false;

  /**
   * Host element as variable for manipulation (CSS in this case)
   */
  @Element() hostEl: HTMLElement;

  getHostClassNames(): string {
    const classNames = [];

    this.hostEl.classList.forEach((value) => {
      if (value !== 'visible' && value !== 'non-fullscreen') {
        classNames.push(value);
      }
    });

    return classNames.join(' ');
  }

  render() {
    return (
      <Host part="mb-overlay" className={ `${classNames({ visible: this.visible, 'non-fullscreen': !this.fullscreen })} ${this.getHostClassNames()}` }>
        <slot></slot>
      </Host>
    );
  }
}
