/*
Copyright (c) Uber Technologies, Inc.

This source code is licensed under the MIT license found in the
LICENSE file in the root directory of this source tree.
*/
// @flow
/* global document */
/* eslint-disable cup/no-undef */
import * as React from 'react';
import FocusLock from 'react-focus-lock';

import {LocaleContext} from '../locale/index.js';
import {getOverrides} from '../helpers/overrides.js';
import {Layer} from '../layer/index.js';
import {SIZE, CLOSE_SOURCE, ANCHOR} from './constants.js';
import {
  StyledRoot,
  StyledBackdrop,
  StyledDrawerContainer,
  StyledDrawerBody,
  StyledClose,
  Hidden,
} from './styled-components.js';
import {CloseIcon} from './close-icon.js';

import type {
  DrawerPropsT,
  DrawerStateT,
  SharedStylePropsArgT,
  CloseSourceT,
  ElementRefT,
} from './types.js';
import {isFocusVisible, forkFocus, forkBlur} from '../utils/focusVisible.js';

class Drawer extends React.Component<DrawerPropsT, DrawerStateT> {
  static defaultProps: $Shape<DrawerPropsT> = {
    animate: true,
    closeable: true,
    isOpen: false,
    overrides: {},
    size: SIZE.default,
    anchor: ANCHOR.right,
    showBackdrop: true,
    autoFocus: true,
    renderAll: false,
  };

  animateOutTimer: ?TimeoutID;
  animateStartTimer: ?AnimationFrameID;
  lastFocus: ?HTMLElement = null;
  lastMountNodeOverflowStyle: ?string = null;
  _refs: {[string]: ElementRefT} = {};

  state = {
    isVisible: false,
    mounted: false,
    isFocusVisible: false,
  };

  componentDidMount() {
    this.setState({mounted: true});
  }

  componentWillUnmount() {
    this.resetMountNodeScroll();
    this.clearTimers();
  }

  componentDidUpdate(prevProps: DrawerPropsT, prevState: DrawerStateT) {
    const {isOpen} = this.props;
    if (
      // If isOpen is changing *or* we just mounted and drawer should be open
      isOpen !== prevProps.isOpen ||
      (isOpen && this.state.mounted && !prevState.mounted)
    ) {
      if (isOpen) {
        this.didOpen();
      } else {
        this.didClose();
      }
    }
  }

  handleFocus = (event: SyntheticEvent<>) => {
    if (isFocusVisible(event)) {
      this.setState({isFocusVisible: true});
    }
  };

  handleBlur = (event: SyntheticEvent<>) => {
    if (this.state.isFocusVisible !== false) {
      this.setState({isFocusVisible: false});
    }
  };

  disableMountNodeScroll() {
    if (this.props.showBackdrop) {
      const mountNode = this.getMountNode();
      this.lastMountNodeOverflowStyle = mountNode.style.overflow || '';
      mountNode.style.overflow = 'hidden';
    }
  }

  resetMountNodeScroll() {
    if (this.props.showBackdrop) {
      const mountNode = this.getMountNode();
      const lastStyle = this.lastMountNodeOverflowStyle;
      if (mountNode && lastStyle !== null) {
        mountNode.style.overflow = lastStyle || '';
        this.lastMountNodeOverflowStyle = null;
      }
    }
  }

  getMountNode(): HTMLElement {
    const {mountNode} = this.props;
    if (mountNode) {
      return mountNode;
    }
    // Flow thinks body could be null (cast through any)
    // eslint-disable-next-line flowtype/no-weak-types
    return ((document.body: any): HTMLBodyElement);
  }

  onEscape = () => {
    if (!this.props.closeable) {
      return;
    }

    this.triggerClose(CLOSE_SOURCE.escape);
  };

  onBackdropClick = (event: Event) => {
    if (this.props.onBackdropClick) {
      this.props.onBackdropClick(event);
    }

    if (!this.props.closeable) {
      return;
    }
    this.triggerClose(CLOSE_SOURCE.backdrop);
  };

  onCloseClick = () => {
    this.triggerClose(CLOSE_SOURCE.closeButton);
  };

  clearTimers() {
    if (this.animateOutTimer) {
      clearTimeout(this.animateOutTimer);
    }
    if (this.animateStartTimer) {
      // eslint-disable-next-line cup/no-undef
      cancelAnimationFrame(this.animateStartTimer);
    }
  }

  didOpen() {
    // Sometimes scroll starts past zero, possibly due to animation
    // Reset scroll to 0 (other libraries do this as well)
    const rootRef = this.getRef('Root').current;
    if (rootRef) {
      rootRef.scrollTop = 0;
    }

    // Clear any existing timers (like previous animateOutTimer)
    this.clearTimers();

    this.disableMountNodeScroll();

    // eslint-disable-next-line cup/no-undef
    this.animateStartTimer = requestAnimationFrame(() => {
      this.setState({isVisible: true});
    });
  }

  didClose() {
    this.resetMountNodeScroll();
    this.animateOutTimer = setTimeout(this.animateOutComplete, 500);
  }

  triggerClose(source?: CloseSourceT) {
    // If there's no source, it just means the isOpen prop changed. No need to call onClose.
    if (this.props.onClose && source) {
      this.props.onClose({
        closeSource: source,
      });
    }
  }

  animateOutComplete = () => {
    this.setState({
      isVisible: false,
    });
  };

  getSharedProps(): $Diff<SharedStylePropsArgT, {children?: React.Node}> {
    const {animate, isOpen, size, closeable, anchor, showBackdrop} = this.props;
    return {
      $animating: animate,
      $isVisible: this.state.isVisible,
      $isOpen: !!isOpen,
      $size: size,
      $closeable: !!closeable,
      $anchor: anchor,
      $isFocusVisible: this.state.isFocusVisible,
      $showBackdrop: showBackdrop,
    };
  }

  getChildren() {
    const {children} = this.props;
    return typeof children === 'function' ? children() : children;
  }

  getRef(component: string): ElementRefT {
    if (!this._refs[component]) {
      this._refs[component] = React.createRef();
    }
    return this._refs[component];
  }

  renderDrawer(renderedContent: React.Node) {
    const {overrides = {}, closeable, autoFocus} = this.props;

    const {
      Root: RootOverride,
      DrawerContainer: DrawerContainerOverride,
      DrawerBody: DrawerBodyOverride,
      Backdrop: BackdropOverride,
      Close: CloseOverride,
    } = overrides;

    const [Root, rootProps] = getOverrides(RootOverride, StyledRoot);
    const [Backdrop, backdropProps] = getOverrides(
      BackdropOverride,
      StyledBackdrop,
    );
    const [DrawerContainer, drawerContainerProps] = getOverrides(
      DrawerContainerOverride,
      StyledDrawerContainer,
    );
    const [DrawerBody, drawerBodyProps] = getOverrides(
      DrawerBodyOverride,
      StyledDrawerBody,
    );
    const [Close, closeProps] = getOverrides(CloseOverride, StyledClose);

    const sharedProps = this.getSharedProps();

    return (
      <LocaleContext.Consumer>
        {locale => {
          return (
            <FocusLock returnFocus autoFocus={autoFocus}>
              <Root
                data-baseweb="drawer"
                ref={this.getRef('Root')}
                {...sharedProps}
                {...rootProps}
              >
                <Backdrop
                  onClick={this.onBackdropClick}
                  {...sharedProps}
                  {...backdropProps}
                />
                <DrawerContainer {...sharedProps} {...drawerContainerProps}>
                  <DrawerBody {...sharedProps} {...drawerBodyProps}>
                    {renderedContent}
                  </DrawerBody>
                  {closeable ? (
                    <Close
                      aria-label={locale.drawer.close}
                      onClick={this.onCloseClick}
                      {...sharedProps}
                      {...closeProps}
                      onFocus={forkFocus(closeProps, this.handleFocus)}
                      onBlur={forkBlur(closeProps, this.handleBlur)}
                    >
                      <CloseIcon title={locale.drawer.close} />
                    </Close>
                  ) : null}
                </DrawerContainer>
              </Root>
            </FocusLock>
          );
        }}
      </LocaleContext.Consumer>
    );
  }

  render() {
    const mountedAndOpen =
      this.state.mounted && (this.props.isOpen || this.state.isVisible);

    const renderedContent =
      mountedAndOpen || this.props.renderAll ? this.getChildren() : null;

    if (renderedContent) {
      if (mountedAndOpen) {
        return (
          <Layer onEscape={this.onEscape} mountNode={this.props.mountNode}>
            {this.renderDrawer(renderedContent)}
          </Layer>
        );
      } else {
        return <Hidden>{renderedContent}</Hidden>;
      }
    }
    return null;
  }
}

export default Drawer;
