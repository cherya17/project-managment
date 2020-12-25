import React, { Component } from 'react';
import { Route } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { ProjectDetail } from './pages/ProjectDetail';
import { Projects } from './pages/Projects';
import { User } from './pages/User';
import './assets/styles/App.css';
import {UserList} from "./pages/UserList";
import {Task} from "./pages/Task";

export default class App extends Component {
  static displayName = App.name;

  render () {
    return (
      <Layout>
        <Route exact path='/' component={Home} />
        <Route exact path='/users' component = {UserList} />
        <Route path='/task/:id' component={Task}/>
        <Route path='/user/:id' component={User} />
        <Route path='/projects/' component={Projects} />
        <Route path='/project/:id' component={ProjectDetail} />
      </Layout>
    );
  }
}
