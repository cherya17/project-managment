﻿import React, {useState, useEffect} from 'react'
import HttpProvider from "../HttpProvider";
import {router} from "../router";
import {Modal, Collapse, Form, Select, Spin, Button, List, Input} from "antd";
import {UserView} from "../components/dumb/user/UserView";
import {Link} from "react-router-dom";
import {connect} from 'react-redux'
import moment from "moment";

import {RightOutlined} from "@ant-design/icons";

import '../assets/styles/pages/Task.css'
import {TaskComment} from "../components/dumb/task/Comment";
import {CreateCommentForm} from "../components/CreateCommentForm";
import {CreateTaskForm} from "../components/CreateTaskForm";
import {setUser} from "../store/user/actions";
import openNotification from "../openNotification";

const {Option} = Select
const {Panel} = Collapse

const loadTask = (taskId, token, callback) => {
    HttpProvider.auth(router.task.one(taskId), token).then((result) => {
        callback(result) 
    })
}

const loadUser = (userId, token, callback) => {
    HttpProvider.auth(router.user.one(userId), token).then((result) => {
        callback(result)
    })
}

const loadComment = (commentId, token, callback) => {
    HttpProvider.auth(router.comment.one(commentId), token).then(callback)
}


const updateTask = (taskId, token, payload, callback) => {
    HttpProvider.auth_put(router.task.one(taskId), payload, token).then(callback)
}

const EditTaskModal = ({task, onEdit, onCancel, visible, assignedUsers, allUsers}) => {
    const [form] = Form.useForm()
    
    return (
        <Modal
            title = 'Edit' 
            okText = 'Edit'
            cancelText = 'Cancel'
            visible = {visible}
            onCancel = {onCancel}
            onOk = {() => {
                form.validateFields()
                    .then((values) => {

                        values.date = values.date.format('YYYY-MM-DD')
                        values.time = values.time.format('HH:mm:ss')
                        
                        values.expirationDate = values.date + 'T' + values.time;
                        delete values.date; delete values.time;
                        
                        values.assignedUsers = values.assignedUsers.map(id => parseInt(id))
                        
                        onEdit(values)
                    })
            } }
        >
            <CreateTaskForm 
                form = {form}
                users = {allUsers}
                initialValues = {{
                    title: task.title,
                    content: task.content,
                    assignedUsers: assignedUsers.map(user => user.id.toString()),
                    date: moment(new Date(task.expirationDate)),
                    time: moment(new Date(task.expirationDate))
                }}
                
            />            
        </Modal>
    )
    
}

export const Task = (props) => {
    
    const {token, user, authenticated, tokenChecked} = props
    
    const [task, setTask] = useState({})
    const [taskLoading, setTaskLoading] = useState(true)
    
    const [users, setUsers] = useState([])
    const [usersLoading, setUsersLoading] = useState(true)
    
    const [statuses, setStatuses] = useState([])
    
    const [creator, setCreator]  = useState({})
    const [project, setProject] = useState({})
    
    const [comments, setComments] = useState([])
    const [userComments, setUserComments] = useState({})
    
    const [usersInProject, setUsersInProject] = useState([])
    const [editModalVisible, setEditModalVisible] = useState(false)
    
    const [taskCreator, setTaskCreator] = useState({})
    
    const [taskIsAccessible, setTaskIsAccessible] = useState(true)
    
    useEffect(() => {  
        if (!tokenChecked)
            return
        
        if (authenticated){
            HttpProvider.auth(router.task.one(props.match.params.id), token) // loading tas
                .then(task => {
                    HttpProvider.auth(router.project.one(task.projectId), token) // loading project task belongs to 
                        .then(proj => {
                            HttpProvider.auth(router.user.one(proj.creatorId), token).then(setCreator) // loadin creator of project
                            setProject(proj)
                        })
                    HttpProvider.auth(router.project.users(task.projectId), token) // loading members of projec
                        .then(setUsersInProject)
                    HttpProvider.auth(router.user.one(task.creatorId), token) // loading creator of task
                        .then(setTaskCreator)
                    
                    setTask(task)
                    setTaskLoading(false)
                    
                    HttpProvider.auth(router.task.users(props.match.params.id), token).then((users) => { // loading assingees
                        debugger
                        setUsers(users)
                        setUsersLoading(false)
                    })
                    
                    HttpProvider.auth(router.comment.list({taskId : props.match.params.id}), token) // loading comments
                        .then(res => {
                            let userIds = new Set(res.map(c => c.userId))

                            userIds.forEach((userId) => {
                                loadUser(userId, token, (user) => {
                                    setUserComments(prev => {
                                        let copy = {...prev}
                                        copy[userId] = user
                                        return copy
                                    })
                                })
                            })

                            setComments(res)
                        })
                    
                })
                .catch(error => {
                    console.log(error)
                    setTaskIsAccessible(false)
                })
        } else {
            HttpProvider.get(router.task.one(props.match.params.id))
                .then(payload => {
                    debugger
                    HttpProvider.get(router.project.one(payload.projectId)).then(proj => {
                        HttpProvider.get(router.user.one(proj.creatorId)).then(setCreator)
                        setProject(proj)
                    })
                    HttpProvider.get(router.project.users(payload.projectId)).then(payload => {
                        setUsersInProject(payload)
                    })
                    HttpProvider.get(router.user.one(payload.creatorId)).then(setTaskCreator)

                    setTask(payload)
                    setTaskLoading(false)
                    
                    HttpProvider.get(router.task.users(props.match.params.id)).then((payload) => {
                        debugger
                        setUsers(payload)
                        setUsersLoading(false)
                    })
                    
                    HttpProvider.get(router.comment.list({taskId : props.match.params.id}))
                        .then(res => {
                            let userIds = new Set(res.map(c => c.userId))

                            userIds.forEach((userId) => {
                                HttpProvider.get(router.user.one(userId)).then( (user) => {
                                    setUserComments(prev => {
                                        let copy = {...prev}
                                        copy[userId] = user
                                        return copy
                                    })
                                })
                            })

                            setComments(res)
                        })
                }).catch(error => {
                    console.log(error)    
                    setTaskIsAccessible(false) 
                })
        }
        HttpProvider.get(router.task.statuses()).then((result) => {
            setStatuses(result)
        })
    }, [tokenChecked])

    if (!taskIsAccessible)
        return <h1>Ooops, something went wrong</h1>
    
    const uploadComment = (comment) => {
        HttpProvider.auth_post(router.comment.list({taskId: props.match.params.id}),comment, token)
            .then( res => {
                if (res.id){
                   loadComment(res.id, token, (comment) => {
                       setComments(prevComments => prevComments.concat([comment]))
                       setUserComments(prev => {
                           if (user.id in prev)
                               return prev
                           const copy = {...prev}
                           copy[user.id] = user;
                           return copy
                       })
                   })
                }
            }).catch(error => {
                openNotification('Failed to upload comment', '')
        })
    }
    
    const onStatusChange = (status) => {
        const payload = {statusId: status}
        HttpProvider.auth_put(router.task.one(task.id), payload, token)
            .then(() => {task.statusId = status.key})
            .catch(error => {
                openNotification('Failed to change status', '')
            })
    }
    
    debugger
    
    if (!tokenChecked)
        return <Spin />
    
    const canLeaveComment = authenticated && user && usersInProject.some(u => u.id === user.id)
    const canEditTask = authenticated && user && (task.creatorId === user.id || user.isAdmin || project.creatorId === user.id)
    const canChangeStatus = authenticated && user && (user.isAdmin || users.some(u => u.id === user.id))
    
    return (
        <>
            {taskLoading || usersLoading ? <Spin /> :
                <>
                    <Link tag = {Link} to={`/project/${task.projectId}`}> <RightOutlined /> <b>{project.name}</b></Link>
                    <hr/>
                    <div className = 'info-bar'>
                        <span> Opened {moment(task.creationDate).format('YYYY-MM-DD')} by <Link tag = {Link} to = {`/user/${taskCreator.id}`}> {taskCreator.fullName} </Link> </span>
                        { !canChangeStatus ? <h6> {statuses.find(s => s.id === task.statusId).name}</h6>:
                            <Select
                                defaultValue = {task.statusId}
                                onChange = {onStatusChange}
                            >
                                {statuses.map(s => <Option key = {s.id} value = {s.id}>{s.name}</Option>)}
                            </Select>
                        }
                    </div>
                    <hr/>
                    <div className = 'task-header'>
                        <h1> {task.title}</h1>
                        {canEditTask&& 
                        <>
                            <Button
                                className = 'task-edit-button'
                                type = 'dashed'
                                onClick = {() => {
                                    setEditModalVisible(true);
                                    console.log(editModalVisible)
                                }}
                            >
                                edit
                            </Button>

                            <EditTaskModal
                                task = {task}
                                visible = {editModalVisible}
                                assignedUsers={users}
                                allUsers={usersInProject}
                                onCancel = {() => setEditModalVisible(false)}
                                onEdit = {(values) => {
                                    setEditModalVisible(false)
                                    updateTask(task.id, token, values, () => {
                                        loadTask(task.id, token, (task) => {
                                            setUsersLoading(true)
                                            HttpProvider.auth(router.task.users(props.match.params.id), token).then((users) => {
                                                setUsers(users)
                                                setUsersLoading(false)
                                            })
                                            setTask(task)
                                        })
                                    })
                                } }
                            />
                        </> 
                        }
                    </div>
                    <div> Expires on the {moment(task.expirationDate).format('YYYY-MM-DD HH:mm')}</div>
                    <h5>{task.content}</h5> 
                </>
            }
            {usersLoading ? <Spin /> :
                <>
                    <Collapse 
                        defaultActivateKey = {['1']}
                    >
                        <Panel key={'1'} header = 'Assigned users'>
                            {users.map(user =>
                                    
                                <Link tag = {Link} to = {`/user/${user.id}`}>
                                    <UserView
                                        key = {user.id}
                                        user = {user}
                                        withFullName
                                    />
                                </Link>)}
                                
                        </Panel>
                    </Collapse>
            </>
        }
        
            <div className = 'comment-section'>
                {comments.length > 0 && Object.keys(userComments).length > 0 &&
                    comments.map(c =>
                        <TaskComment
                            key={c.id}
                            user={userComments[c.userId] ?? {id : 0, fullName: 'Dummy'}}
                            comment={c}
                        />)
                }
                 
                {canLeaveComment &&
                    <CreateCommentForm
                        className = 'comment-create-form'
                        onCreate = {uploadComment}
                    />
                }
            </div>
        </>
    ) 
}

const mapStateToProps = (state) => {
    return {
        token: state.user.token,
        user: state.user.user, 
        authenticated: state.user.token !== null && state.user.tokenChecked,
        tokenChecked: state.user.tokenChecked
    }
}

const mapActionsToDispatch = {
    setUser
}

export default connect(mapStateToProps, mapActionsToDispatch)(Task)