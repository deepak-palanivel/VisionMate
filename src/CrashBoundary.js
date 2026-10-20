import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export class CrashBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
    this.previousGlobalHandler = null;
  }

  componentDidMount() {
    if (global.ErrorUtils?.getGlobalHandler && global.ErrorUtils?.setGlobalHandler) {
      this.previousGlobalHandler = global.ErrorUtils.getGlobalHandler();
      global.ErrorUtils.setGlobalHandler((error) => {
        this.setState({ error });
      });
    }
  }

  componentWillUnmount() {
    if (this.previousGlobalHandler && global.ErrorUtils?.setGlobalHandler) {
      global.ErrorUtils.setGlobalHandler(this.previousGlobalHandler);
    }
  }

  componentDidCatch(error) {
    this.setState({ error });
  }

  render() {
    if (this.state.error != null) {
      return (
        <View style={styles.container}>
          <Text style={styles.title}>Vision Mate hit a startup error</Text>
          <Text style={styles.copy}>
            {this.state.error.message ?? 'Unknown app error'}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#030507',
    padding: 24,
  },
  title: {
    color: '#ffe16a',
    fontSize: 24,
    fontWeight: '900',
    textAlign: 'center',
  },
  copy: {
    marginTop: 12,
    color: '#ffffff',
    fontSize: 16,
    lineHeight: 22,
    textAlign: 'center',
  },
});
