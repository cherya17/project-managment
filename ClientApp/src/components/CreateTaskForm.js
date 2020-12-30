﻿import React from 'react'
import {Form, Input, TimePicker, DatePicker, Select} from "antd";
import moment from 'moment'
import SunEditor from 'suneditor-react';

const {TextArea} = Input
const {Option} = Select

export const CreateTaskForm = ({form, users, initialValues}) => {

    return (
        <Form 
            form = {form}
            layout = 'vertical'
            name = 'create_task_form'
            initialValues={initialValues}
            >
            <Form.Item 
                label = 'Title'
                name = 'title'
                rules = {[
                    { required: true, message : 'title filed should not be empty' }
                ]}
            >
                <Input />
            </Form.Item>
            
            {/* <Form.Item 
                label = 'Content'
                name = 'content'
                rules = {[
                    { required: true, message : 'content filed should not be empty' }
                ]}
            >
                <TextArea 
                    rows = {3} 
                    showCount={true} 
                    maxLength={512}
                /> 
            </Form.Item> */}

            <Form.Item 
                label = 'Content'
                name = 'content'
            >
               <SunEditor /> 
            </Form.Item>
            <Form.Item label = 'Expires on'>
                <div style = {{
                    display: 'flex',
                    flexDirection: 'row'
                }}>
                    <Form.Item
                        label = 'Date'
                        name = 'date'
                    >
                        <DatePicker name = 'date' />
                    </Form.Item>
                    <Form.Item
                        label = 'Time'
                        name = 'time'
                        style = {{marginLeft: '2rem'}} 
                    >
                        <TimePicker name = 'time' />
                    </Form.Item>
                </div>
            </Form.Item>
            
            <Form.Item 
                label = 'Assign users'
                name = 'assignedUsers'
            >
                <Select mode = 'multiple'>
                    {users.map((user) => <Option key = {user.id}>{user.fullName}</Option>)}
                </Select>
            </Form.Item>
                
        </Form>
    )
}