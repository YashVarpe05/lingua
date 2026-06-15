import React, { useEffect, useState } from "react";
import { FlatList, Text, View } from "react-native";
import { supabase } from "./utils/supabase";

interface Todo {
	id: number;
	name: string;
}

export default function App() {
	const [todos, setTodos] = useState<Todo[]>([]);

	useEffect(() => {
		const getTodos = async () => {
			try {
        const { data: todos, error } = await supabase
          .from("todos")
          .select("id, name")
          .overrideTypes<Todo[], { merge: false }>();

				if (error) {
					console.error("Error fetching todos:", error.message);
					return;
				}

				if (todos && todos.length > 0) {
					setTodos(todos);
				}
			} catch (error) {
				if (error instanceof Error) {
					console.error("Error fetching todos:", error.message);
				} else {
					console.error("Error fetching todos:", error);
				}
			}
		};

		getTodos();
	}, []);

	return (
		<View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
			<Text>Todo List</Text>
			<FlatList
				data={todos}
				keyExtractor={(item) => item.id.toString()}
				renderItem={({ item }) => <Text key={item.id}>{item.name}</Text>}
			/>
		</View>
	);
}
